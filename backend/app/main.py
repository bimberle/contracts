from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app import models
import logging
import subprocess
import os
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Log version on startup
BACKEND_VERSION = "1.0.47"
logger.info("=" * 50)
logger.info(f"=== Contracts Backend v{BACKEND_VERSION} starting ===")
logger.info("=" * 50)

# Fix database schema directly (bypassing Alembic due to broken migration chain)
def fix_database_schema():
    """Fix the amount_increases column type directly with raw SQL"""
    try:
        logger.info("Checking and fixing database schema...")
        with engine.connect() as conn:
            # Check if price_increases table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'price_increases'
                )
            """))
            table_exists = result.scalar()
            
            if not table_exists:
                logger.info("price_increases table doesn't exist yet, skipping fix")
                return
            
            # Check current column type
            result = conn.execute(text("""
                SELECT data_type 
                FROM information_schema.columns 
                WHERE table_name = 'price_increases' 
                AND column_name = 'amount_increases'
            """))
            row = result.fetchone()
            
            if row is None:
                # Column doesn't exist, add it as JSONB
                logger.info("Adding amount_increases column as JSONB...")
                conn.execute(text("""
                    ALTER TABLE price_increases 
                    ADD COLUMN amount_increases JSONB DEFAULT '{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'::jsonb
                """))
                conn.commit()
                logger.info("Added amount_increases column successfully")
            else:
                current_type = row[0].lower()
                logger.info(f"Current amount_increases column type: {current_type}")
                
                if current_type in ('double precision', 'real', 'numeric', 'float', 'float8', 'float4'):
                    # Column is wrong type - drop and recreate
                    logger.info("Fixing amount_increases column: dropping and recreating as JSONB...")
                    conn.execute(text("ALTER TABLE price_increases DROP COLUMN amount_increases"))
                    conn.execute(text("""
                        ALTER TABLE price_increases 
                        ADD COLUMN amount_increases JSONB DEFAULT '{"software_rental": 0, "software_care": 0, "apps": 0, "purchase": 0}'::jsonb
                    """))
                    conn.commit()
                    logger.info("Fixed amount_increases column successfully")
                elif current_type in ('json', 'jsonb'):
                    logger.info("amount_increases column already has correct type")
                else:
                    logger.warning(f"Unknown column type: {current_type}")
                    
    except Exception as e:
        logger.error(f"Error fixing database schema: {e}")
        # Don't raise - let the app start anyway

# Fix schema on module load
fix_database_schema()

app = FastAPI(
    title="Contract Management API",
    description="API für die Verwaltung von Verträgen und Provisionsberechnungen",
    version="1.0.47"
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

@app.get("/api/auth/check")
def auth_check():
    """Check if authentication is required"""
    return {"auth_required": False}

from app.routers import customers, contracts, settings, price_increases, commission_rates, analytics, auth

# Include routers
app.include_router(auth.router)
app.include_router(customers.router, prefix="/api/customers")
app.include_router(contracts.router, prefix="/api/contracts")
app.include_router(settings.router, prefix="/api/settings")
app.include_router(price_increases.router, prefix="/api/price-increases")
app.include_router(commission_rates.router)
app.include_router(analytics.router, prefix="/api/analytics")
