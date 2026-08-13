"""add_quotation_subtotal

Revision ID: 0003_add_quotation_subtotal
Revises: 0002_rag_polish
Create Date: 2026-07-15 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0003_add_quotation_subtotal'
down_revision: str | None = '0002_rag_polish'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "quotation",
        sa.Column("subtotal", sa.Float(), nullable=False, server_default=sa.text("0")),
    )


def downgrade() -> None:
    op.drop_column("quotation", "subtotal")
