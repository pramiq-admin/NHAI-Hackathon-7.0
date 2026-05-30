from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.admin import (
    Admin,
    AdminSignupIn,
    AdminLoginIn,
    AdminOut,
    AdminTokenOut,
)
from app.auth.jwt import create_role_token, get_current_admin
from app.security.middleware import limiter
from app.utils.aadhar import (
    validate_aadhar_format,
    normalize_aadhar,
    hash_aadhar,
    verify_aadhar,
    mask_aadhar,
)

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


def _to_out_with_aadhar(a: Admin, plain_aadhar: str | None = None) -> AdminOut:
    """Build AdminOut. Plain aadhar (if provided) is used only to render the
    last-4 mask — it is never echoed back in the clear."""
    masked = mask_aadhar(plain_aadhar) if plain_aadhar else "XXXX-XXXX-XXXX"
    return AdminOut(
        id=a.id,
        name=a.name,
        mobile=a.mobile,
        aadhar_masked=masked,
        created_at=a.created_at,
    )


# Generic message used for ALL signup/login failures to avoid leaking which
# field was wrong (account/Aadhar enumeration). The actual diagnostic
# (mobile already taken vs Aadhar already taken vs bad checksum) is logged
# server-side but not returned.
_GENERIC_AUTH_ERROR = "Invalid mobile, Aadhar, or registration not allowed"


@router.post("/signup", response_model=AdminTokenOut)
# 3/min/IP is generous for legitimate use, brutal for enumeration attacks.
@limiter.limit("3/minute")
async def admin_signup(
    payload: AdminSignupIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not validate_aadhar_format(payload.aadhar):
        raise HTTPException(status_code=400, detail=_GENERIC_AUTH_ERROR)

    normalized_aadhar = normalize_aadhar(payload.aadhar)
    aadhar_hash, salt = hash_aadhar(normalized_aadhar)

    # Existence checks. We use the same generic error in both cases to avoid
    # confirming whether a particular mobile/Aadhar is registered.
    existing = (await db.execute(select(Admin).where(Admin.mobile == payload.mobile))).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=_GENERIC_AUTH_ERROR)
    existing_aadhar = (
        await db.execute(select(Admin).where(Admin.aadhar_hash == aadhar_hash))
    ).scalar_one_or_none()
    if existing_aadhar is not None:
        raise HTTPException(status_code=409, detail=_GENERIC_AUTH_ERROR)

    # NOTE: `face_template_id` is NOT accepted from the client. The server has
    # no way to verify a template id the client claims, so trusting it would
    # let an attacker forge a face-binding claim (S7). For now admins have no
    # server-side face id; on-device duplicate detection still works because
    # the templates table is local. If/when we add server-side face binding
    # it must go through an attested enrollment endpoint, not free-form input.
    admin = Admin(
        name=payload.name,
        mobile=payload.mobile,
        aadhar_hash=aadhar_hash,
        aadhar_salt=salt,
        face_template_id=None,
    )
    db.add(admin)
    await db.commit()
    await db.refresh(admin)

    token, ttl = create_role_token(admin.id, "admin")
    return AdminTokenOut(
        access_token=token,
        token_type="bearer",
        expires_in=ttl,
        admin=_to_out_with_aadhar(admin, payload.aadhar),
    )


@router.post("/login", response_model=AdminTokenOut)
@limiter.limit("5/minute")
async def admin_login(
    payload: AdminLoginIn,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Login by mobile + Aadhar. Both must match. Generic 401 for any failure
    so attackers can't tell whether the mobile or the Aadhar was wrong."""
    if not validate_aadhar_format(payload.aadhar):
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)

    admin = (
        await db.execute(select(Admin).where(Admin.mobile == payload.mobile))
    ).scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)

    if not verify_aadhar(payload.aadhar, admin.aadhar_hash, admin.aadhar_salt):
        raise HTTPException(status_code=401, detail=_GENERIC_AUTH_ERROR)

    token, ttl = create_role_token(admin.id, "admin")
    return AdminTokenOut(
        access_token=token,
        token_type="bearer",
        expires_in=ttl,
        admin=_to_out_with_aadhar(admin, payload.aadhar),
    )


@router.get("/me", response_model=AdminOut)
async def admin_me(admin_id: str = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    admin = (await db.execute(select(Admin).where(Admin.id == admin_id))).scalar_one_or_none()
    if admin is None:
        raise HTTPException(status_code=404, detail="Admin not found")
    return _to_out_with_aadhar(admin, None)
