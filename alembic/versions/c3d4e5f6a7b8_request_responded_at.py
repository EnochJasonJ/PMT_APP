"""add responded_at to admin_requests

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-06-08 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('admin_requests', sa.Column('responded_at', sa.DateTime(), nullable=True))
    # Backfill: already-answered requests get their updated_at as the response time.
    op.execute(
        "UPDATE admin_requests SET responded_at = updated_at "
        "WHERE status::text <> 'pending' AND response_content IS NOT NULL"
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('admin_requests', 'responded_at')
