"""add therapists table

Revision ID: e5f3a8c1d9b4
Revises: d8a1c9f2b3e7
Create Date: 2026-08-04 15:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5f3a8c1d9b4'
down_revision: Union[str, Sequence[str], None] = 'd8a1c9f2b3e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'therapists',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(length=200), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('therapists')
