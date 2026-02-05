"""Add cloud_amount to contracts

Revision ID: 012_add_cloud_amount
Revises: 011_add_amount_increases_json
Create Date: 2026-02-02

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '012_add_cloud_amount'
down_revision = '011_add_amount_increases_json'
branch_labels = None
depends_on = None


def upgrade():
    # Add cloud_amount column to contracts
    op.add_column('contracts', sa.Column('cloud_amount', sa.Float(), nullable=True))
    
    # Set default value for existing contracts
    op.execute("UPDATE contracts SET cloud_amount = 0 WHERE cloud_amount IS NULL")
    
    # Make column non-nullable with default
    op.alter_column('contracts', 'cloud_amount', nullable=True)


def downgrade():
    op.drop_column('contracts', 'cloud_amount')
