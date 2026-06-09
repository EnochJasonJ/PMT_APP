"""phase4 team hierarchy + project allocation

Revision ID: a1b2c3d4e5f6
Revises: 9f942cfcb7b8
Create Date: 2026-06-08 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9f942cfcb7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Team hierarchy: self-referential parent.
    op.add_column('teams', sa.Column('parent_team_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_teams_parent_team_id', 'teams', 'teams',
        ['parent_team_id'], ['id'], ondelete='SET NULL'
    )

    # 2. Project <-> many Teams.
    op.create_table(
        'project_teams',
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('team_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['team_id'], ['teams.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id', 'team_id'),
    )

    # 3. Project <-> individually-allocated members.
    op.create_table(
        'project_members',
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('project_id', 'user_id'),
    )

    # 4. Backfill: every existing project's primary team becomes an allocated team.
    op.execute(
        "INSERT INTO project_teams (project_id, team_id) "
        "SELECT id, team_id FROM projects WHERE team_id IS NOT NULL "
        "ON CONFLICT DO NOTHING"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('project_members')
    op.drop_table('project_teams')
    op.drop_constraint('fk_teams_parent_team_id', 'teams', type_='foreignkey')
    op.drop_column('teams', 'parent_team_id')
