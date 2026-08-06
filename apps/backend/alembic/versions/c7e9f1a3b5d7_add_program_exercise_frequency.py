"""add program exercise frequency

Revision ID: c7e9f1a3b5d7
Revises: a2b4c6d8e0f2
Create Date: 2026-08-06 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7e9f1a3b5d7'
down_revision: Union[str, Sequence[str], None] = 'a2b4c6d8e0f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('program_exercises', sa.Column('frequency_per_week', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('program_exercises', 'frequency_per_week')
