"""phase4b team_members many-to-many (user in multiple teams)

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-08 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'team_members',
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('team_id', 'user_id'),
    )
    # Backfill: each user's existing primary team becomes a membership row.
    op.execute(
        "INSERT INTO team_members (team_id, user_id) "
        "SELECT team_id, id FROM users WHERE team_id IS NOT NULL "
        "ON CONFLICT DO NOTHING"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('team_members')
