"""Fix: Actually remove rental_start_date column from contracts table

Revision ID: 007_fix_remove_rental_start_date
Revises: 006_remove_rental_start_date
Create Date: 2026-01-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '007_fix_remove_rental_start_date'
down_revision = '006_remove_rental_start_date'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove rental_start_date column from contracts table"""
    # Drop the rental_start_date column
    op.drop_column('contracts', 'rental_start_date')


def downgrade() -> None:
    """Add back rental_start_date column"""
    op.add_column('contracts', sa.Column('rental_start_date', sa.DateTime(), nullable=False))

