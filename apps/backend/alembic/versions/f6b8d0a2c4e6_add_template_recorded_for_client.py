"""add exercise_templates.recorded_for_client_id

Revision ID: f6b8d0a2c4e6
Revises: e4a7c9f1b3d5
Create Date: 2026-08-25 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f6b8d0a2c4e6'
down_revision: Union[str, Sequence[str], None] = 'e4a7c9f1b3d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('exercise_templates', sa.Column('recorded_for_client_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_exercise_templates_recorded_for_client_id',
        'exercise_templates', 'clients',
        ['recorded_for_client_id'], ['id'],
    )


def downgrade() -> None:
    op.drop_constraint('fk_exercise_templates_recorded_for_client_id', 'exercise_templates', type_='foreignkey')
    op.drop_column('exercise_templates', 'recorded_for_client_id')
