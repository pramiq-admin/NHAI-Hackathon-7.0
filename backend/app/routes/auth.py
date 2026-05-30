"""Legacy device-token endpoint.

This was used by the original VerificationScreen → attendance pipeline. The
new worker/admin role-based auth replaces it. Kept under a feature flag so
existing demos still work, but defaults to disabled so a leaked APK can't
mint tokens via the shared-secret-in-source vector.
"""
import hmac as _hmac
from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel
from app.config import get_settings
from app.auth.jwt import create_access_token
from app.security.middleware import limiter

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


class TokenRequest(BaseModel):
    device_id: str
    shared_secret: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


@router.post("/token", response_model=TokenResponse)
@limiter.limit("5/minute")
async def issue_device_token(req: TokenRequest, request: Request):
    settings = get_settings()
    if not settings.DEVICE_TOKEN_ENABLED:
        # The endpoint exists in the route table for back-compat URL stability
        # but is closed by default. Operators flip DEVICE_TOKEN_ENABLED=true
        # only when they've also rotated DEVICE_SHARED_SECRET away from default.
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Device token endpoint is disabled. Use /admin/login or /worker/login.",
        )
    # Constant-time compare (avoid timing oracle on the shared secret).
    if not _hmac.compare_digest(req.shared_secret, settings.DEVICE_SHARED_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Invalid shared secret"
        )
    token = create_access_token(req.device_id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=settings.JWT_EXPIRE_MINUTES * 60,
    )
