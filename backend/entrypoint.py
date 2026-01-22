#!/usr/bin/env python3
"""
Database initialization and migration orchestration.
Runs before the FastAPI application starts.
"""
import subprocess
import os
import sys
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def wait_for_db(max_attempts=30, interval=1):
    """Wait for PostgreSQL to be ready."""
    import psycopg2
    
    db_url = os.getenv('DATABASE_URL', 'postgresql://contracts_user:contracts_password@database:5432/contracts')
    
    for attempt in range(max_attempts):
        try:
            conn = psycopg2.connect(db_url)
            conn.close()
            logger.info("✅ Database is ready")
            return True
        except psycopg2.OperationalError as e:
            if attempt < max_attempts - 1:
                logger.info(f"Waiting for database... ({attempt + 1}/{max_attempts})")
                time.sleep(interval)
            else:
                logger.error(f"❌ Database not available after {max_attempts} attempts")
                return False
    
    return False


def run_migrations():
    """Run Alembic migrations only if database already has tables."""
    skip_migrations = os.getenv('SKIP_MIGRATIONS', 'false').lower() == 'true'
    
    if skip_migrations:
        logger.info("⏭️  Skipping migrations (SKIP_MIGRATIONS=true)")
        return True
    
    # Check if this is a fresh installation (no tables yet)
    # If so, skip Alembic - main.py will create tables via ORM
    import psycopg2
    db_url = os.getenv('DATABASE_URL', 'postgresql://contracts_user:contracts_password@database:5432/contracts')
    
    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        cur.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'customers'
            )
        """)
        customers_exists = cur.fetchone()[0]
        cur.close()
        conn.close()
        
        if not customers_exists:
            logger.info("⏭️  Fresh installation - skipping Alembic (tables will be created by ORM)")
            return True
            
    except Exception as e:
        logger.warning(f"Could not check for existing tables: {e}")
        # Continue with migrations anyway
    
    logger.info("🔄 Running database migrations...")
    
    try:
        result = subprocess.run(
            ['alembic', 'upgrade', 'head'],
            cwd='/app',
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            logger.info("✅ Migrations complete")
            if result.stdout:
                logger.info(f"Output:\n{result.stdout}")
            return True
        else:
            logger.error(f"❌ Migrations failed")
            if result.stdout:
                logger.error(f"STDOUT:\n{result.stdout}")
            if result.stderr:
                logger.error(f"STDERR:\n{result.stderr}")
            return False
    
    except subprocess.TimeoutExpired:
        logger.error("❌ Migrations timed out")
        return False
    except Exception as e:
        logger.error(f"❌ Error running migrations: {e}")
        return False


def main():
    logger.info("==================================================")
    logger.info("=== Contracts Backend v1.0.53 starting ===")
    logger.info("==================================================")
    
    # Wait for database
    if not wait_for_db():
        logger.error("Failed to connect to database")
        sys.exit(1)
    
    # Run migrations (will be skipped for fresh installs)
    if not run_migrations():
        logger.error("Migrations failed")
        sys.exit(1)
    
    # Start server
    logger.info("🚀 Starting Uvicorn server...")
    os.execvp('uvicorn', ['uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000'])


if __name__ == '__main__':
    main()
