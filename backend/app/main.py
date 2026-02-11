from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app import models
import logging
import subprocess
import os
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Log version on startup
BACKEND_VERSION = "1.0.75"
logger.info("=" * 50)
logger.info(f"=== Contracts Backend v{BACKEND_VERSION} starting ===")
logger.info("=" * 50)

# Latest migration revision (used to stamp alembic_version for fresh installs)
LATEST_MIGRATION = "013_add_incl_early_pi"

def initialize_database():
    """
    Initialize database schema.
    For fresh installations: Create all tables via SQLAlchemy ORM and stamp alembic version.
    For existing installations: Let Alembic handle migrations.
    """
    try:
        logger.info("Checking database schema...")
        with engine.connect() as conn:
            # Check if any of our core tables exist
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'customers'
                )
            """))
            customers_exists = result.scalar()
            
            if not customers_exists:
                logger.info("Fresh installation detected - creating all tables...")
                # Create all tables from ORM models
                Base.metadata.create_all(bind=engine)
                logger.info("✅ All tables created successfully")
                
                # Stamp alembic version to latest so migrations don't run on existing schema
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS alembic_version (
                        version_num VARCHAR(32) NOT NULL,
                        CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
                    )
                """))
                conn.execute(text("DELETE FROM alembic_version"))
                conn.execute(text(f"INSERT INTO alembic_version (version_num) VALUES ('{LATEST_MIGRATION}')"))
                conn.commit()
                logger.info(f"✅ Alembic version stamped to {LATEST_MIGRATION}")
            else:
                logger.info("Existing database detected - schema already initialized")
                
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

# Initialize database on module load
initialize_database()

app = FastAPI(
    title="Contract Management API",
    description="API für die Verwaltung von Verträgen und Provisionsberechnungen",
    version="1.0.49"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Contract Management API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/health")
def api_health_check():
    return {"status": "healthy"}

@app.get("/api/version")
def get_version():
    """Get backend version information"""
    return {
        "service": "contracts-backend",
        "version": BACKEND_VERSION
    }

from app.routers import customers, contracts, settings, price_increases, commission_rates, analytics, auth, system

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(customers.router, prefix="/api/customers")
app.include_router(contracts.router, prefix="/api/contracts")
app.include_router(settings.router, prefix="/api/settings")
app.include_router(price_increases.router, prefix="/api/price-increases")
app.include_router(commission_rates.router)
app.include_router(analytics.router, prefix="/api/analytics")
app.include_router(system.router)
