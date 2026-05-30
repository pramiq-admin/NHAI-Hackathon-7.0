import re

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.worker import Worker, WorkerLoginIn, WorkerOut, WorkerTokenOut
from app.auth.jwt import create_role_token
from app.security.middleware import limiter
from app.utils.aadhar import (
    validate_aadhar_format,
    normalize_aadhar,
    verify_aadhar,
    mask_aadhar,
)

router = APIRouter(prefix="/api/v1/worker", tags=["worker-auth"])


def _norm_name(s: str) -> str:
    """Trim + collapse internal whitespace + lowercase. Makes 'Ramesh  Kumar '
    match 'ramesh kumar' so a typing slip doesn't lock a worker out."""
    return re.sub(r"\s+", " ", (s or "").strip()).lower()


@router.post("/login", response_model=WorkerTokenOut)
# 10/min/IP — workers may legitimately retry on typos, but throttle hard
# enough that brute-forcing a 12-digit Aadhar with a known name takes years.
@limiter.limit("10/minute")
async def worker_login(
    payload: WorkerLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Worker logs in with name + Aadhar. DB match required.

    Per-worker salts mean we can't WHERE on aadhar_hash directly. Instead we
    narrow candidates by normalized name (case-insensitive) at the DB layer,
    then verify the per-row hash. For hackathon scale (< 1k workers per admin)
    this stays cheap; for larger deployments add a name index lookup table.
    """
    if not validate_aadhar_format(payload.aadhar):
        # Use the same generic 401 as a wrong match so format-vs-mismatch isn't
        # distinguishable by an attacker doing brute force.
        raise HTTPException(status_code=401, detail="Invalid name or Aadhar number")

    normalized_aadhar = normalize_aadhar(payload.aadhar)
    normalized_name = _norm_name(payload.name)
    if not normalized_name:
        raise HTTPException(status_code=401, detail="Invalid name or Aadhar number")

    # Narrow at DB layer: active workers whose lowercased name matches.
    candidates = (
        await db.execute(
            select(Worker).where(
                Worker.active.is_(True),
                func.lower(Worker.name) == normalized_name,
            )
        )
    ).scalars().all()

    matched: Worker | None = None
    for w in candidates:
        # Defensive: re-normalize stored name too in case it contains extra spaces.
        if _norm_name(w.name) != normalized_name:
            continue
        # verify_aadhar handles both legacy SHA-256 and new HMAC schemes and
        # uses constant-time compare to avoid timing side-channels.
        if verify_aadhar(normalized_aadhar, w.aadhar_hash, w.aadhar_salt):
            matched = w
            break

    if matched is None:
        raise HTTPException(status_code=401, detail="Invalid name or Aadhar number")

    token, ttl = create_role_token(matched.id, "worker")
    return WorkerTokenOut(
        access_token=token,
        token_type="bearer",
        expires_in=ttl,
        worker=WorkerOut(
            id=matched.id,
            name=matched.name,
            aadhar_masked=mask_aadhar(payload.aadhar),
            admin_id=matched.admin_id,
            active=matched.active,
            created_at=matched.created_at,
        ),
    )
