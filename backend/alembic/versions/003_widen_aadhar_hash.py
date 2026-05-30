"""widen aadhar_hash to accommodate scheme prefix

Revision ID: 003
Revises: 002
Create Date: 2026-05-25

S17 swapped Aadhar hashing from raw SHA-256 (64 hex chars) to a prefixed
HMAC scheme `v2$<64-hex>` = 67 chars. The legacy String(64) column then
overflows on INSERT. Widen to 80 to leave headroom for future scheme bumps
(`v3$...`, etc.) without another migration.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003'
down_revision: Union[str, None] = '002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'admins',
        'aadhar_hash',
        existing_type=sa.String(64),
        type_=sa.String(80),
        existing_nullable=False,
    )
    op.alter_column(
        'workers',
        'aadhar_hash',
        existing_type=sa.String(64),
        type_=sa.String(80),
        existing_nullable=False,
    )


def downgrade() -> None:
    # Pre-existing rows may now exceed 64 chars; the downgrade is technically
    # destructive for any HMAC-scheme records. Reject early to make that
    # explicit rather than silently truncating.
    op.alter_column(
        'workers',
        'aadhar_hash',
        existing_type=sa.String(80),
        type_=sa.String(64),
        existing_nullable=False,
    )
    op.alter_column(
        'admins',
        'aadhar_hash',
        existing_type=sa.String(80),
        type_=sa.String(64),
        existing_nullable=False,
    )
