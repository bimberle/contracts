"""Add name2 field to customers table

Revision ID: 002_add_name2_to_customers
Revises: 001_split_contract_price
Create Date: 2026-01-13 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_add_name2_to_customers'
down_revision = '001_split_contract_price'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add name2 column to customers table.
    For existing customers, duplicate the name field to name2.
    """
    # Check if column already exists (for fresh installs)
    try:
        with op.batch_alter_table('customers', schema=None) as batch_op:
            batch_op.add_column(sa.Column('name2', sa.String(), nullable=True))
        
        # Set default value for existing rows: copy name to name2
        op.execute("UPDATE customers SET name2 = name WHERE name2 IS NULL")
        
        # Now make it NOT NULL
        with op.batch_alter_table('customers', schema=None) as batch_op:
            batch_op.alter_column('name2', existing_type=sa.String(), nullable=False)
            batch_op.create_index('ix_customers_name2', ['name2'])
    except Exception:
        # Column might already exist in fresh installs
        pass


def downgrade() -> None:
    """
    Remove name2 column from customers table.
    """
    try:
        with op.batch_alter_table('customers', schema=None) as batch_op:
            batch_op.drop_index('ix_customers_name2')
            batch_op.drop_column('name2')
    except Exception:
        pass
