"""Add included_early_price_increase_ids to contracts

Revision ID: 013_add_incl_early_pi
Revises: 012_add_cloud_amount
Create Date: 2026-02-07

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '013_add_incl_early_pi'
down_revision = '012_add_cloud_amount'
branch_labels = None
depends_on = None


def upgrade():
    # Add included_early_price_increase_ids column (JSON array of IDs)
    op.add_column('contracts', sa.Column('included_early_price_increase_ids', sa.JSON(), nullable=True))
    
    # Set default value for existing contracts
    op.execute("UPDATE contracts SET included_early_price_increase_ids = '[]' WHERE included_early_price_increase_ids IS NULL")


def downgrade():
    op.drop_column('contracts', 'included_early_price_increase_ids')
