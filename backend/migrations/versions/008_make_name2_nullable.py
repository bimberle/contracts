"""Make name2 nullable in customers table

Revision ID: 008_make_name2_nullable
Revises: 007_fix_remove_rental_start_date
Create Date: 2026-01-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '008_make_name2_nullable'
down_revision = '007_fix_remove_rental_start_date'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Make name2 column nullable in customers table"""
    op.alter_column('customers', 'name2',
               existing_type=sa.String(),
               nullable=True)


def downgrade() -> None:
    """Make name2 column not nullable again"""
    op.alter_column('customers', 'name2',
               existing_type=sa.String(),
               nullable=False)

