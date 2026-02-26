"""Create backup_history table with customer_count and contract_count

Revision ID: 016_add_backup_counts
Revises: 015_exit_payout_settings
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '016_add_backup_counts'
down_revision = '015_exit_payout_settings'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    # Erstelle Tabelle wenn sie nicht existiert
    if 'backup_history' not in inspector.get_table_names():
        op.create_table(
            'backup_history',
            sa.Column('id', sa.String(), primary_key=True),
            sa.Column('filename', sa.String(), nullable=False),
            sa.Column('database_name', sa.String(), nullable=False),
            sa.Column('file_size', sa.Integer(), nullable=True),
            sa.Column('customer_count', sa.Integer(), nullable=True),
            sa.Column('contract_count', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(), nullable=True),
            sa.Column('error_message', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )
    else:
        # Falls Tabelle existiert, füge fehlende Spalten hinzu
        existing_columns = [col['name'] for col in inspector.get_columns('backup_history')]
        
        if 'customer_count' not in existing_columns:
            op.add_column('backup_history', sa.Column('customer_count', sa.Integer(), nullable=True))
        
        if 'contract_count' not in existing_columns:
            op.add_column('backup_history', sa.Column('contract_count', sa.Integer(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'backup_history' in inspector.get_table_names():
        op.drop_table('backup_history')
