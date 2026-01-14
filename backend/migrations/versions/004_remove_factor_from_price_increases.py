"""Remove factor column from price_increases table.

Revision ID: 004_remove_factor_from_price_increases
Revises: 003_remove_commission_rates_from_settings
Create Date: 2026-01-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '004_remove_factor_from_price_increases'
down_revision = '003_remove_commission_rates_from_settings'  # References migration 003
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove the factor column from price_increases table
    op.drop_column('price_increases', 'factor')


def downgrade() -> None:
    # Add the factor column back (for rollback)
    op.add_column('price_increases', 
        sa.Column('factor', sa.Float(), nullable=False, default=0.0)
    )
