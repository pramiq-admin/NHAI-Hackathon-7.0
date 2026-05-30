"""add admin, worker, punch_events tables

Revision ID: 002
Revises: 001
Create Date: 2026-05-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'admins',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('mobile', sa.String(20), nullable=False, unique=True, index=True),
        sa.Column('aadhar_hash', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('aadhar_salt', sa.String(64), nullable=False),
        sa.Column('face_template_id', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'workers',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('name', sa.String(128), nullable=False, index=True),
        sa.Column('aadhar_hash', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('aadhar_salt', sa.String(64), nullable=False),
        sa.Column('face_template_id', sa.String(64), nullable=True),
        sa.Column('admin_id', sa.String(64), sa.ForeignKey('admins.id'), nullable=False, index=True),
        sa.Column('active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table(
        'punch_events',
        sa.Column('id', sa.String(64), primary_key=True),
        sa.Column('worker_id', sa.String(64), sa.ForeignKey('workers.id'), nullable=False, index=True),
        sa.Column('type', sa.String(8), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column('gps_lat', sa.Float, nullable=True),
        sa.Column('gps_lon', sa.Float, nullable=True),
        sa.Column('gps_accuracy', sa.Float, nullable=True),
        sa.Column('face_match_score', sa.Float, nullable=True),
        sa.Column('liveness_passed', sa.Boolean, default=True),
        sa.Column('device_id', sa.String(128), nullable=True),
        sa.Column('sync_attempts', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )


def downgrade() -> None:
    op.drop_table('punch_events')
    op.drop_table('workers')
    op.drop_table('admins')
