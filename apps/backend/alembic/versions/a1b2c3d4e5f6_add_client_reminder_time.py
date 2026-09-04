"""add clients.reminder_hour and reminder_minute

Revision ID: a1b2c3d4e5f6
Revises: f6b8d0a2c4e6
Create Date: 2026-08-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f6b8d0a2c4e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('reminder_hour', sa.Integer(), nullable=True))
    op.add_column('clients', sa.Column('reminder_minute', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('clients', 'reminder_minute')
    op.drop_column('clients', 'reminder_hour')
