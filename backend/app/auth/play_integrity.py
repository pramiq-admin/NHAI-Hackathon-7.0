"""Play Integrity API hookup.

⚠ The Google Play Integrity API requires OAuth2 service-account credentials
   and a different request body shape than what's wired below. The current
   `verify_play_integrity` will always return False against the real API
   because of this. Until that's wired up properly:

   - In dev: integrity is best-effort. If `INTEGRITY_REQUIRED=false` (default
     dev), missing/invalid tokens are tolerated.
   - In production: `INTEGRITY_REQUIRED=true` must be set AND the verify
     function must be replaced with a real OAuth2-backed implementation,
     otherwise every request will be 403'd.

   The previous behaviour of "silently pass if no token" has been removed — it
   was a defense-in-depth bypass (just omit the header to skip the check).
"""
import os
import time
import httpx
from fastapi import HTTPException, status

_integrity_cache: dict[str, tuple[bool, float]] = {}
CACHE_TTL = 3600


def _integrity_required() -> bool:
    """Whether to fail-closed when the integrity header is missing/invalid.
    Defaults to False in dev so the demo doesn't break for absent tokens."""
    return os.environ.get("INTEGRITY_REQUIRED", "false").lower() in ("1", "true", "yes")


async def verify_play_integrity(token: str, device_id: str) -> bool:
    now = time.time()
    cached = _integrity_cache.get(device_id)
    if cached and (now - cached[1]) < CACHE_TTL:
        return cached[0]

    try:
        # TODO: replace with the real Play Integrity API call (OAuth2 service
        #       account + decodeIntegrityToken request shape).
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://playintegrity.googleapis.com/v1/decodeIntegrityToken",
                json={"integrity_token": token},
                headers={"Content-Type": "application/json"},
                timeout=10,
            )

        if resp.status_code != 200:
            _integrity_cache[device_id] = (False, now)
            return False

        data = resp.json()
        verdict = data.get("tokenPayloadExternal", {})
        device_integrity = verdict.get("deviceIntegrity", {})
        labels = device_integrity.get("deviceRecognitionVerdict", [])

        is_genuine = "MEETS_DEVICE_INTEGRITY" in labels
        _integrity_cache[device_id] = (is_genuine, now)
        return is_genuine

    except Exception:
        return False


async def require_device_integrity(
    integrity_token: str | None,
    device_id: str,
) -> None:
    """Enforce device integrity. Behaviour:

    - If `INTEGRITY_REQUIRED=false` (default) and no token → pass.
      This keeps dev/demo flows working without Play Services configured.
    - If `INTEGRITY_REQUIRED=true` (production) and no token → 403.
      Previously this branch silently passed — a trivial defense bypass.
    - If a token is present, it's always verified; failure → 403 either way.
    """
    if integrity_token is None:
        if _integrity_required():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Device integrity token required",
            )
        return
    is_genuine = await verify_play_integrity(integrity_token, device_id)
    if not is_genuine:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device integrity check failed",
        )
