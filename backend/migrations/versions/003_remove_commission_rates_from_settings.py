"""Remove commission_rates from settings table

Revision ID: 003_remove_commission_rates_from_settings
Revises: 002_add_name2_to_customers
Create Date: 2026-01-13 21:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_remove_commission_rates_from_settings'
down_revision = '002_add_name2_to_customers'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the commission_rates column from settings table
    op.drop_column('settings', 'commission_rates')


def downgrade() -> None:
    # Re-add the commission_rates column
    op.add_column('settings', sa.Column('commission_rates', sa.JSON(), nullable=True))
