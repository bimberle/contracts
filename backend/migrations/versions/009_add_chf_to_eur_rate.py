"""Add CHF to EUR rate (placeholder migration)"""
from alembic import op
import sqlalchemy as sa

# Revision identifiers
revision = '009_add_chf_to_eur_rate'
down_revision = '008_make_name2_nullable'
branch_labels = None
depends_on = None

def upgrade():
    # This migration is a placeholder - no schema changes needed
    pass

def downgrade():
    # This migration is a placeholder - no schema changes needed
    pass
