"""Add exit payout tiers and exit payout by type to settings

Revision ID: 015_exit_payout_settings
Revises: 014_add_seats
Create Date: 2026-02-25

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '015_exit_payout_settings'
down_revision = '014_add_seats'
branch_labels = None
depends_on = None


def upgrade():
    # Add exit_payout_tiers column (JSON array of tiers)
    op.add_column('settings', sa.Column('exit_payout_tiers', sa.JSON(), nullable=True))
    
    # Add exit_payout_by_type column (JSON object with type configs)
    op.add_column('settings', sa.Column('exit_payout_by_type', sa.JSON(), nullable=True))
    
    # Set default values
    default_tiers = '[{"min_seats": 1, "max_seats": 5, "months": 48}, {"min_seats": 6, "max_seats": 10, "months": 54}]'
    default_by_type = '{"software_rental": {"enabled": true, "additional_months": 12}, "software_care": {"enabled": false, "additional_months": 0}, "apps": {"enabled": true, "additional_months": 12}, "purchase": {"enabled": true, "additional_months": 12}, "cloud": {"enabled": false, "additional_months": 0}}'
    
    op.execute(f"UPDATE settings SET exit_payout_tiers = '{default_tiers}' WHERE exit_payout_tiers IS NULL")
    op.execute(f"UPDATE settings SET exit_payout_by_type = '{default_by_type}' WHERE exit_payout_by_type IS NULL")


def downgrade():
    op.drop_column('settings', 'exit_payout_tiers')
    op.drop_column('settings', 'exit_payout_by_type')
