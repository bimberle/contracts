"""Add excluded_price_increase_ids to contracts table"""
from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = '010_add_excluded_price_increases'
down_revision = '009_add_chf_to_eur_rate'
branch_labels = None
depends_on = None

def upgrade():
    # Check if table exists before adding column
    inspector = sa.inspect(op.get_bind())
    if 'contracts' in inspector.get_table_names():
        # Check if column already exists
        columns = [col['name'] for col in inspector.get_columns('contracts')]
        if 'excluded_price_increase_ids' not in columns:
            op.add_column('contracts', 
                sa.Column('excluded_price_increase_ids', sa.JSON(), nullable=True, server_default='[]'))

def downgrade():
    # Check if table exists before dropping column
    inspector = sa.inspect(op.get_bind())
    if 'contracts' in inspector.get_table_names():
        columns = [col['name'] for col in inspector.get_columns('contracts')]
        if 'excluded_price_increase_ids' in columns:
            op.drop_column('contracts', 'excluded_price_increase_ids')
