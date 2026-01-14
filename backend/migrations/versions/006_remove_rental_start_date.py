"""Remove rental_start_date, use start_date as rental start

Revision ID: 006_remove_rental_start_date
Revises: 005_add_personal_tax_rate
Create Date: 2026-01-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '006_remove_rental_start_date'
down_revision = '005_add_personal_tax_rate'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove rental_start_date column from contracts table"""
    # Drop the rental_start_date column if it exists
    try:
        op.drop_column('contracts', 'rental_start_date')
    except Exception:
        pass


def downgrade() -> None:
    """Add back rental_start_date column"""
    try:
        op.add_column('contracts', sa.Column('rental_start_date', sa.DateTime(), nullable=True))
    except Exception:
        pass
