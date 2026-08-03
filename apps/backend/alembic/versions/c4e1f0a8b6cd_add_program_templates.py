"""add program templates

Revision ID: c4e1f0a8b6cd
Revises: b3f0a2d4e6c1
Create Date: 2026-08-03 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e1f0a8b6cd'
down_revision: Union[str, Sequence[str], None] = 'b3f0a2d4e6c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'program_templates',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('body_region', sa.String(length=100), nullable=True),
        sa.Column('injury_type', sa.String(length=100), nullable=True),
        sa.Column('functional_focus', sa.String(length=200), nullable=True),
        sa.Column('recovery_phase', sa.String(length=100), nullable=True),
        sa.Column('goals', sa.Text(), nullable=True),
        sa.Column('ergonomic_recommendations', sa.Text(), nullable=True),
        sa.Column('precautions', sa.Text(), nullable=True),
        sa.Column('equipment_needed', sa.Text(), nullable=True),
        sa.Column('progression_criteria', sa.Text(), nullable=True),
        sa.Column('frequency_per_week', sa.Integer(), nullable=True),
        sa.Column('schedule_days', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_table(
        'program_template_exercises',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('program_template_id', sa.String(), nullable=False),
        sa.Column('template_id', sa.String(), nullable=False),
        sa.Column('order', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['program_template_id'], ['program_templates.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['exercise_templates.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('program_template_exercises')
    op.drop_table('program_templates')
