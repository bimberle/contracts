"""Add personal_tax_rate to settings table.

Revision ID: 005_add_personal_tax_rate
Revises: 004_remove_factor_from_price_increases
Create Date: 2026-01-13

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '005_add_personal_tax_rate'
down_revision = '004_remove_factor_from_price_increases'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add personal_tax_rate column to settings table
    op.add_column('settings', 
        sa.Column('personal_tax_rate', sa.Float(), server_default='42.0', nullable=False)
    )


def downgrade() -> None:
    # Remove the personal_tax_rate column (for rollback)
    op.drop_column('settings', 'personal_tax_rate')
