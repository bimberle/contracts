"""Add customer_count and contract_count to backup_history

Revision ID: 016
Revises: 015
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '016'
down_revision = '015'
branch_labels = None
depends_on = None


def upgrade():
    # Prüfe ob Tabelle existiert
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'backup_history' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('backup_history')]
        
        if 'customer_count' not in existing_columns:
            op.add_column('backup_history', sa.Column('customer_count', sa.Integer(), nullable=True))
        
        if 'contract_count' not in existing_columns:
            op.add_column('backup_history', sa.Column('contract_count', sa.Integer(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'backup_history' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('backup_history')]
        
        if 'contract_count' in existing_columns:
            op.drop_column('backup_history', 'contract_count')
        
        if 'customer_count' in existing_columns:
            op.drop_column('backup_history', 'customer_count')
