"""Add app_version to backup_history

Revision ID: 017_add_backup_app_version
Revises: 016_add_backup_counts
Create Date: 2026-02-26
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '017_add_backup_app_version'
down_revision = '016_add_backup_counts'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'backup_history' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('backup_history')]
        
        if 'app_version' not in existing_columns:
            op.add_column('backup_history', sa.Column('app_version', sa.String(), nullable=True))


def downgrade():
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    
    if 'backup_history' in inspector.get_table_names():
        existing_columns = [col['name'] for col in inspector.get_columns('backup_history')]
        
        if 'app_version' in existing_columns:
            op.drop_column('backup_history', 'app_version')
