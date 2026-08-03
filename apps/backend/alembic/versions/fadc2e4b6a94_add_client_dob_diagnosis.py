"""add client dob and diagnosis

Revision ID: fadc2e4b6a94
Revises: c4e1f0a8b6cd
Create Date: 2026-08-03 15:45:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fadc2e4b6a94'
down_revision: Union[str, Sequence[str], None] = 'c4e1f0a8b6cd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('dob', sa.Date(), nullable=True))
    op.add_column('clients', sa.Column('diagnosis', sa.String(length=200), nullable=True))


def downgrade() -> None:
    op.drop_column('clients', 'diagnosis')
    op.drop_column('clients', 'dob')
