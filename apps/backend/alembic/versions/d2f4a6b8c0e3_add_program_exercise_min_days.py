"""add program exercise min days between submissions

Revision ID: d2f4a6b8c0e3
Revises: c7e9f1a3b5d7
Create Date: 2026-08-10 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd2f4a6b8c0e3'
down_revision: Union[str, Sequence[str], None] = 'c7e9f1a3b5d7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('program_exercises', sa.Column('min_days_between', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('program_exercises', 'min_days_between')
