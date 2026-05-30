"""initial attendance table

Revision ID: 001
Revises:
Create Date: 2026-05-24
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'attendance',
        sa.Column('event_id', sa.String(64), primary_key=True),
        sa.Column('user_id', sa.String(64), nullable=False, index=True),
        sa.Column('user_name', sa.String(128), nullable=False),
        sa.Column('device_id', sa.String(128), nullable=False, index=True),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cosine_score', sa.Float, nullable=False),
        sa.Column('liveness_passed', sa.Boolean, default=True),
        sa.Column('pad_score', sa.Float, nullable=True),
        sa.Column('latency_ms', sa.Float, nullable=True),
        sa.Column('gps_lat', sa.Float, nullable=True),
        sa.Column('gps_lon', sa.Float, nullable=True),
        sa.Column('synced_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('notes', sa.Text, nullable=True),
    )


def downgrade() -> None:
    op.drop_table('attendance')
