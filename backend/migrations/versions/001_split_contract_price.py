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
    Split the 'price' column into 'fixed_price' and 'adjustable_price'.
    If existing data exists, assume 50/50 split (can be manually adjusted later).
    """
    # Add new columns
    op.add_column('contracts', sa.Column('fixed_price', sa.Float(), nullable=True))
    op.add_column('contracts', sa.Column('adjustable_price', sa.Float(), nullable=True))
    
    # Migrate existing data if 'price' column exists
    try:
        # For existing contracts: split price 50/50 between fixed and adjustable
        op.execute('''
            UPDATE contracts 
            SET fixed_price = price * 0.5, 
                adjustable_price = price * 0.5
            WHERE price IS NOT NULL
        ''')
    except Exception:
        # If table doesn't exist yet (fresh install), that's fine
        pass
    
    # Make columns NOT NULL after migration
    op.alter_column('contracts', 'fixed_price', nullable=False)
    op.alter_column('contracts', 'adjustable_price', nullable=False)
    
    # Drop old price column
    try:
        op.drop_column('contracts', 'price')
    except Exception:
        # Column might not exist in fresh installs
        pass


def downgrade() -> None:
    """Restore the original 'price' column"""
    # Recreate price column as sum of fixed and adjustable
    op.add_column('contracts', sa.Column('price', sa.Float(), nullable=True))
    
    op.execute('''
        UPDATE contracts 
        SET price = fixed_price + adjustable_price
    ''')
    
    op.alter_column('contracts', 'price', nullable=False)
    
    # Drop new columns
    op.drop_column('contracts', 'fixed_price')
    op.drop_column('contracts', 'adjustable_price')
