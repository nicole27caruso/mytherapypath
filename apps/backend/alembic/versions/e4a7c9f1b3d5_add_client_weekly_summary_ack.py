"""add client last_summary_week_start

Revision ID: e4a7c9f1b3d5
Revises: d2f4a6b8c0e3
Create Date: 2026-08-11 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4a7c9f1b3d5'
down_revision: Union[str, Sequence[str], None] = 'd2f4a6b8c0e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('last_summary_week_start', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('clients', 'last_summary_week_start')
