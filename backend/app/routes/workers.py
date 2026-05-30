from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.worker import Worker, WorkerCreateIn, WorkerOut
from app.auth.jwt import get_current_admin
from app.security.middleware import limiter
from app.utils.aadhar import (
    validate_aadhar_format,
    normalize_aadhar,
    hash_aadhar,
    mask_aadhar,
)

router = APIRouter(prefix="/api/v1/workers", tags=["workers"])

# Generic error for create flow — don't tell the caller whether Aadhar is the
# problem vs format vs duplicate, so they can't enumerate enrolled workers.
_GENERIC_CREATE_ERROR = "Cannot register worker with provided details"


def _to_out(w: Worker, plain_aadhar: str | None = None) -> WorkerOut:
    masked = mask_aadhar(plain_aadhar) if plain_aadhar else "XXXX-XXXX-XXXX"
    return WorkerOut(
        id=w.id,
        name=w.name,
        aadhar_masked=masked,
        admin_id=w.admin_id,
        active=w.active,
        created_at=w.created_at,
    )


@router.post("", response_model=WorkerOut)
@limiter.limit("20/minute")
async def create_worker(
    payload: WorkerCreateIn,
    request: Request,
    admin_id: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not validate_aadhar_format(payload.aadhar):
        raise HTTPException(status_code=400, detail=_GENERIC_CREATE_ERROR)

    normalized = normalize_aadhar(payload.aadhar)
    aadhar_hash, salt = hash_aadhar(normalized)

    existing = (
        await db.execute(select(Worker).where(Worker.aadhar_hash == aadhar_hash))
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status_code=409, detail=_GENERIC_CREATE_ERROR)

    # face_template_id is NOT accepted from the client (S7). Same reasoning as
    # in admin signup: server can't verify the claim, on-device matching works
    # without it. Field stays in the schema for future attested-enrollment
    # support but is ignored here.
    worker = Worker(
        name=payload.name,
        aadhar_hash=aadhar_hash,
        aadhar_salt=salt,
        face_template_id=None,
        admin_id=admin_id,
        active=True,
    )
    db.add(worker)
    await db.commit()
    await db.refresh(worker)
    return _to_out(worker, payload.aadhar)


@router.get("", response_model=list[WorkerOut])
async def list_workers(
    admin_id: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (
        await db.execute(
            select(Worker).where(Worker.admin_id == admin_id).order_by(Worker.created_at.desc())
        )
    ).scalars().all()
    return [_to_out(w) for w in rows]


@router.get("/{worker_id}", response_model=WorkerOut)
async def get_worker(
    worker_id: str,
    admin_id: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    worker = (
        await db.execute(select(Worker).where(Worker.id == worker_id, Worker.admin_id == admin_id))
    ).scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    return _to_out(worker)


@router.delete("/{worker_id}")
async def delete_worker(
    worker_id: str,
    admin_id: str = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Soft delete — sets active=false."""
    worker = (
        await db.execute(select(Worker).where(Worker.id == worker_id, Worker.admin_id == admin_id))
    ).scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    await db.execute(update(Worker).where(Worker.id == worker_id).values(active=False))
    await db.commit()
    return {"ok": True, "deactivated": worker_id}
