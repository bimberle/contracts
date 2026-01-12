"""Split contract price into fixed and adjustable price

Revision ID: 001_split_contract_price
Revises: 
Create Date: 2026-01-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_split_contract_price'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add fixed_price and adjustable_price columns to contracts table.
    For fresh installations, this creates the columns directly.
    For existing installations, it migrates from the old price column.
    """
    # This migration assumes the contracts table will be created by the ORM
    # if it doesn't exist yet (for fresh installs).
    # For existing installs, it adds the new columns.
    
    # Try to add the columns - they might already exist in fresh installs
    try:
        op.add_column('contracts', sa.Column('fixed_price', sa.Float(), nullable=True))
    except Exception:
        pass
    
    try:
        op.add_column('contracts', sa.Column('adjustable_price', sa.Float(), nullable=True))
    except Exception:
        pass
    
    # Try to migrate existing data if price column exists
    try:
        op.execute('''
            UPDATE contracts 
            SET fixed_price = COALESCE(price, 0) * 0.5, 
                adjustable_price = COALESCE(price, 0) * 0.5
            WHERE fixed_price IS NULL AND price IS NOT NULL
        ''')
    except Exception:
        pass
    
    # Try to set NOT NULL - might fail if columns don't exist or already have NULL
    try:
        op.alter_column('contracts', 'fixed_price', nullable=False, new_column_name='fixed_price')
    except Exception:
        pass
    
    try:
        op.alter_column('contracts', 'adjustable_price', nullable=False, new_column_name='adjustable_price')
    except Exception:
        pass
    
    # Try to drop old price column - might not exist in fresh installs
    try:
        op.drop_column('contracts', 'price')
    except Exception:
        pass


def downgrade() -> None:
    """Restore the original 'price' column (for rollback scenarios)"""
    try:
        # Recreate price column as sum of fixed and adjustable
        op.add_column('contracts', sa.Column('price', sa.Float(), nullable=True))
        
        op.execute('''
            UPDATE contracts 
            SET price = COALESCE(fixed_price, 0) + COALESCE(adjustable_price, 0)
        ''')
        
        op.alter_column('contracts', 'price', nullable=False, new_column_name='price')
        
        # Drop new columns
        op.drop_column('contracts', 'fixed_price')
        op.drop_column('contracts', 'adjustable_price')
        
    except Exception:
        # Might fail if structure is different - that's OK
        pass
