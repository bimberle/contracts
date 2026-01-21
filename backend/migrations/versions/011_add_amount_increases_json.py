"""Add amount_increases as JSON column to price_increases table.

The price_increases table originally had a 'factor' column (Float).
This was changed to 'amount_increases' (JSON) to support different
percentage increases per contract type.

This migration adds the amount_increases column if it doesn't exist,
or alters it from Float to JSON if it was incorrectly created.

Revision ID: 011_add_amount_increases_json
Revises: 010_add_excluded_price_increases
Create Date: 2026-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON


# revision identifiers, used by Alembic.
revision = '011_add_amount_increases_json'
down_revision = '010_add_excluded_price_increases'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Get current table structure
    inspector = sa.inspect(op.get_bind())
    
    if 'price_increases' not in inspector.get_table_names():
        # Table doesn't exist yet, it will be created by SQLAlchemy
        return
    
    columns = {col['name']: col for col in inspector.get_columns('price_increases')}
    
    if 'amount_increases' not in columns:
        # Column doesn't exist, add it as JSON
        op.add_column('price_increases', 
            sa.Column('amount_increases', JSON(), nullable=True, 
                      server_default='{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'))
    else:
        # Column exists - check if it's the wrong type (Float/Double)
        col_type = str(columns['amount_increases']['type']).upper()
        if 'FLOAT' in col_type or 'DOUBLE' in col_type or 'NUMERIC' in col_type:
            # Need to drop and recreate as JSON
            op.drop_column('price_increases', 'amount_increases')
            op.add_column('price_increases', 
                sa.Column('amount_increases', JSON(), nullable=True,
                          server_default='{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'))


def downgrade() -> None:
    # We can't really downgrade this safely, just leave the column
    pass
