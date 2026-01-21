
"""Add amount_increases as JSON column to price_increases table.

The price_increases table originally had a 'factor' column (Float).
This was changed to 'amount_increases' (JSON) to support different
percentage increases per contract type.

This migration alters the amount_increases column from Float to JSONB.

Revision ID: 011_add_amount_increases_json
Revises: 010_add_excluded_price_increases
Create Date: 2026-01-21
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = '011_add_amount_increases_json'
down_revision = '010_add_excluded_price_increases'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL to alter the column type directly
    # This handles the case where the column exists as DOUBLE PRECISION
    conn = op.get_bind()
    
    # Check if table exists
    result = conn.execute(sa.text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'price_increases'
        )
    """))
    table_exists = result.scalar()
    
    if not table_exists:
        return
    
    # Check current column type
    result = conn.execute(sa.text("""
        SELECT data_type 
        FROM information_schema.columns 
        WHERE table_name = 'price_increases' 
        AND column_name = 'amount_increases'
    """))
    row = result.fetchone()
    
    if row is None:
        # Column doesn't exist, add it as JSONB
        op.add_column('price_increases', 
            sa.Column('amount_increases', JSONB(), nullable=True,
                      server_default='{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'))
    else:
        current_type = row[0].lower()
        if current_type in ('double precision', 'real', 'numeric', 'float', 'float8', 'float4'):
            # Column is wrong type - drop and recreate
            # First, drop the column
            op.drop_column('price_increases', 'amount_increases')
            # Then add it as JSONB
            op.add_column('price_increases', 
                sa.Column('amount_increases', JSONB(), nullable=True,
                          server_default='{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'))
        elif current_type not in ('json', 'jsonb'):
            # Unknown type, try to alter it
            conn.execute(sa.text("""
                ALTER TABLE price_increases 
                DROP COLUMN amount_increases
            """))
            conn.execute(sa.text("""
                ALTER TABLE price_increases 
                ADD COLUMN amount_increases JSONB DEFAULT '{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'::jsonb
            """))


def downgrade() -> None:
    # We can't really downgrade this safely, just leave the column
    pass
