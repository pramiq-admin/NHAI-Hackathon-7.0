from datetime import datetime, timedelta, timezone
from typing import Literal
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from app.config import get_settings

bearer_scheme = HTTPBearer()

Role = Literal["device", "admin", "worker"]


def create_access_token(device_id: str) -> str:
    """Legacy device token (kept for backwards compatibility)."""
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    payload = {
        "sub": device_id,
        "role": "device",
        "exp": expires,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_role_token(sub: str, role: Role, ttl_minutes: int | None = None) -> tuple[str, int]:
    """Create a JWT carrying both subject (admin/worker/device id) and role.

    Returns (token, expires_in_seconds).
    """
    settings = get_settings()
    minutes = ttl_minutes if ttl_minutes is not None else (
        720 if role in ("admin", "worker") else settings.JWT_EXPIRE_MINUTES
    )
    expires = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {
        "sub": sub,
        "role": role,
        "exp": expires,
        "iat": datetime.now(timezone.utc),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, minutes * 60


def _decode(credentials: HTTPAuthorizationCredentials) -> dict:
    settings = get_settings()
    try:
        return jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
            options={"leeway": settings.JWT_LEEWAY_SECONDS},
        )
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired or invalid")


def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Legacy: returns subject regardless of role. Keep for existing routes."""
    payload = _decode(credentials)
    sub: str | None = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return sub


def require_role(*allowed_roles: Role):
    """Dependency factory: ensures token's role is one of allowed_roles. Returns (sub, role)."""

    def _dep(
        credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    ) -> tuple[str, str]:
        payload = _decode(credentials)
        sub: str | None = payload.get("sub")
        role: str | None = payload.get("role")
        if sub is None or role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' not allowed for this resource",
            )
        return sub, role

    return _dep


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Returns admin_id from JWT, raises 403 if not an admin token."""
    payload = _decode(credentials)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    sub: str | None = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return sub


def get_current_worker(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> str:
    """Returns worker_id from JWT, raises 403 if not a worker token."""
    payload = _decode(credentials)
    if payload.get("role") != "worker":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Worker role required")
    sub: str | None = payload.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return sub
