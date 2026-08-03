"""add program notes and schedule_days

Revision ID: b3f0a2d4e6c1
Revises: acc4dbd1d42a
Create Date: 2026-07-29 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3f0a2d4e6c1'
down_revision: Union[str, None] = 'acc4dbd1d42a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('programs', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('programs', sa.Column('schedule_days', sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column('programs', 'schedule_days')
    op.drop_column('programs', 'notes')
