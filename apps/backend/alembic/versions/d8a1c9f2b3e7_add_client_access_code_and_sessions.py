"""add client access code and sessions

Revision ID: d8a1c9f2b3e7
Revises: fadc2e4b6a94
Create Date: 2026-08-04 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8a1c9f2b3e7'
down_revision: Union[str, Sequence[str], None] = 'fadc2e4b6a94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('clients', sa.Column('access_code', sa.String(length=20), nullable=True))
    op.create_unique_constraint('uq_clients_access_code', 'clients', ['access_code'])

    op.create_table(
        'client_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('client_id', sa.String(), nullable=False),
        sa.Column('token', sa.String(length=64), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['client_id'], ['clients.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_client_sessions_client_id', 'client_sessions', ['client_id'])
    op.create_index('ix_client_sessions_token', 'client_sessions', ['token'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_client_sessions_token', table_name='client_sessions')
    op.drop_index('ix_client_sessions_client_id', table_name='client_sessions')
    op.drop_table('client_sessions')

    op.drop_constraint('uq_clients_access_code', 'clients', type_='unique')
    op.drop_column('clients', 'access_code')
