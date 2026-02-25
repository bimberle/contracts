"""Add number_of_seats to contracts for exit payout tiers

Revision ID: 014_add_seats
Revises: 013_add_incl_early_pi
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '014_add_seats'
down_revision = '013_add_incl_early_pi'
branch_labels = None
depends_on = None


def upgrade():
    # Add number_of_seats column (Integer)
    op.add_column('contracts', sa.Column('number_of_seats', sa.Integer(), nullable=True))
    
    # Set default value for existing contracts
    op.execute("UPDATE contracts SET number_of_seats = 1 WHERE number_of_seats IS NULL")


def downgrade():
    op.drop_column('contracts', 'number_of_seats')
