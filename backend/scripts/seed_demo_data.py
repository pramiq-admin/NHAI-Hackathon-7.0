"""Seed demo data for the NHAI attendance backend.

Creates:
  - 1 admin (mobile 9999900001, name "Demo Admin")
  - 5 workers (under the admin)
  - 30 days of randomized but realistic punch events for each worker

Idempotent: safe to re-run. Uses the same Aadhar / mobile fixtures so re-runs are no-ops.

Run from backend/ directory:
    python scripts/seed_demo_data.py
"""
import asyncio
import os
import random
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Ensure the backend/app package is importable when run as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from app.db.session import engine, AsyncSessionLocal  # noqa: E402
from app.models.attendance import Base  # noqa: E402
from app.models.admin import Admin  # noqa: E402
from app.models.worker import Worker  # noqa: E402
from app.models.punch_event import PunchEvent  # noqa: E402
from app.utils.aadhar import hash_aadhar  # noqa: E402


# Fixed fixtures (so re-runs are idempotent).
# Aadhar numbers are NOT hard-coded here — they're generated deterministically
# via `make_valid_aadhar(seed=N)` below so we always get a valid Verhoeff
# checksum AND the same number across re-runs (which is what makes the script
# idempotent + the demo credentials reproducible).
ADMIN = {
    "name": "Demo Admin",
    "mobile": "9999900001",
}

WORKERS = [
    {"name": "Ramesh Kumar"},
    {"name": "Suresh Verma"},
    {"name": "Mahesh Singh"},
    {"name": "Dinesh Patel"},
    {"name": "Rajesh Yadav"},
]

# India Standard Time — punches are stored in UTC in the DB, but generated FROM
# IST so the display times look right on an Indian device.
from datetime import timezone as _tz, timedelta as _td  # local re-import for IST
IST = _tz(_td(hours=5, minutes=30))


# These Aadhar samples may not pass Verhoeff. Generate valid ones programmatically.
def make_valid_aadhar(seed: int) -> str:
    """Generate a valid 12-digit Aadhar using Verhoeff."""
    from app.utils.aadhar import _VERHOEFF_D, _VERHOEFF_P
    rng = random.Random(seed)
    while True:
        body = [rng.randint(0, 9) for _ in range(11)]
        if body[0] in (0, 1):
            body[0] = 2
        c = 0
        # compute check digit so that full number checksums to 0
        for i, d in enumerate(reversed(body)):
            c = _VERHOEFF_D[c][_VERHOEFF_P[(i + 1) % 8][d]]
        # check digit = inverse of c
        inv = [0, 4, 3, 2, 1, 5, 6, 7, 8, 9]
        check = inv[c]
        full = "".join(str(d) for d in body) + str(check)
        # verify
        c2 = 0
        for i, d in enumerate(reversed(full)):
            c2 = _VERHOEFF_D[c2][_VERHOEFF_P[i % 8][int(d)]]
        if c2 == 0:
            return full


async def seed():
    # Ensure tables exist (for first-time runs without alembic upgrade)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ---- Admin ----
        admin_aadhar = make_valid_aadhar(seed=1)
        admin_existing = (
            await db.execute(select(Admin).where(Admin.mobile == ADMIN["mobile"]))
        ).scalar_one_or_none()
        if admin_existing:
            admin = admin_existing
            print(f"✓ Admin already exists: {admin.name} ({admin.mobile})")
        else:
            ah, salt = hash_aadhar(admin_aadhar)
            admin = Admin(
                id=str(uuid.uuid4()),
                name=ADMIN["name"],
                mobile=ADMIN["mobile"],
                aadhar_hash=ah,
                aadhar_salt=salt,
            )
            db.add(admin)
            await db.commit()
            await db.refresh(admin)
            print(f"+ Created admin: {admin.name} ({admin.mobile})")
            print(f"  Aadhar (for demo login): {admin_aadhar}")

        # ---- Workers ----
        created_workers = []
        for i, w in enumerate(WORKERS):
            wa = make_valid_aadhar(seed=10 + i)
            ah, salt = hash_aadhar(wa)
            existing = (
                await db.execute(
                    select(Worker).where(Worker.aadhar_hash == ah)
                )
            ).scalar_one_or_none()
            if existing:
                print(f"✓ Worker exists: {existing.name}")
                created_workers.append((existing, wa))
                continue
            wk = Worker(
                id=str(uuid.uuid4()),
                name=w["name"],
                aadhar_hash=ah,
                aadhar_salt=salt,
                admin_id=admin.id,
                active=True,
            )
            db.add(wk)
            await db.commit()
            await db.refresh(wk)
            print(f"+ Created worker: {wk.name}  Aadhar(demo)={wa}")
            created_workers.append((wk, wa))

        # ---- Punch events: 30 days per worker, randomized realistic punches ----
        # Anchor "now" in IST so the morning punches (8-9 am IST) render as
        # 8-9 am on an Indian device. Convert to UTC at storage time.
        now_ist = datetime.now(IST)
        events_added = 0
        for wk, _wa in created_workers:
            for d in range(30):
                day_ist = now_ist - timedelta(days=d)
                # skip Sundays (~14%)
                if day_ist.weekday() == 6:
                    continue
                rng = random.Random(int(wk.id[:8], 16) ^ d)
                # ~10% absent
                if rng.random() < 0.10:
                    continue
                in_h = 8 + rng.randint(0, 1)  # 8-9 am IST
                in_m = rng.randint(0, 59)
                punch_in_ist = day_ist.replace(hour=in_h, minute=in_m, second=0, microsecond=0)
                # work duration 7-10 hours
                work_minutes = 60 * 7 + rng.randint(0, 60 * 3)
                punch_out_ist = punch_in_ist + timedelta(minutes=work_minutes)
                # Persist in UTC (PostgreSQL TIMESTAMPTZ normalises anyway, but
                # being explicit keeps round-trips obvious).
                punch_in_ts = punch_in_ist.astimezone(timezone.utc)
                punch_out_ts = punch_out_ist.astimezone(timezone.utc)

                in_id = f"seed-{wk.id[:8]}-{d}-in"
                out_id = f"seed-{wk.id[:8]}-{d}-out"

                # idempotent check
                exists = (
                    await db.execute(
                        select(PunchEvent).where(PunchEvent.id == in_id)
                    )
                ).scalar_one_or_none()
                if exists:
                    continue

                db.add(
                    PunchEvent(
                        id=in_id,
                        worker_id=wk.id,
                        type="in",
                        timestamp=punch_in_ts,
                        gps_lat=28.6 + rng.random() * 0.1,
                        gps_lon=77.2 + rng.random() * 0.1,
                        gps_accuracy=10.0,
                        face_match_score=0.85 + rng.random() * 0.12,
                        liveness_passed=True,
                        device_id="seed-device",
                    )
                )
                # ~5% miss the punch-out
                if rng.random() > 0.05:
                    db.add(
                        PunchEvent(
                            id=out_id,
                            worker_id=wk.id,
                            type="out",
                            timestamp=punch_out_ts,
                            gps_lat=28.6 + rng.random() * 0.1,
                            gps_lon=77.2 + rng.random() * 0.1,
                            gps_accuracy=10.0,
                            face_match_score=0.85 + rng.random() * 0.12,
                            liveness_passed=True,
                            device_id="seed-device",
                        )
                    )
                events_added += 2
        await db.commit()
        print(f"+ Added {events_added} punch events across {len(created_workers)} workers")
        print("\n" + "=" * 60)
        print("Demo login credentials (always printed, idempotent across re-runs):")
        print("=" * 60)
        # Print admin creds every time — admin login now requires BOTH mobile
        # AND Aadhar (Phase B security fix), so re-runs need to surface them.
        print(f"  ADMIN")
        print(f"    Mobile: {ADMIN['mobile']}")
        print(f"    Aadhar: {admin_aadhar}")
        print(f"  WORKERS (login with Name + Aadhar)")
        for wk, wa in created_workers:
            print(f"    {wk.name}  →  Aadhar: {wa}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
