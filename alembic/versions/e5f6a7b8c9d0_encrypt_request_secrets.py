"""encrypt existing admin_requests.response_content at rest

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-08 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.core.crypto import encrypt_secret, _PREFIX


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Encrypt any plaintext response_content already stored."""
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            "SELECT id, response_content FROM admin_requests "
            "WHERE response_content IS NOT NULL "
            "AND response_content NOT LIKE :p"
        ),
        {"p": f"{_PREFIX}%"},
    ).fetchall()
    for row_id, plaintext in rows:
        conn.execute(
            sa.text("UPDATE admin_requests SET response_content = :c WHERE id = :id"),
            {"c": encrypt_secret(plaintext), "id": row_id},
        )


def downgrade() -> None:
    """Irreversible: ciphertext cannot be safely reverted to plaintext columns."""
    pass
