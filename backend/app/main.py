from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app import models
import logging
import subprocess
import os

logger = logging.getLogger(__name__)

# Log version on startup
BACKEND_VERSION = "1.0.46"
logger.info("=" * 50)
logger.info(f"=== Contracts Backend v{BACKEND_VERSION} starting ===")
logger.info("=" * 50)

# Run Alembic migrations on startup
def run_migrations():
    """Run Alembic migrations to update database schema"""
    try:
        logger.info("Running Alembic migrations...")
        # Change to the app directory where alembic.ini is located
        app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=app_dir,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            logger.info("Alembic migrations completed successfully")
            if result.stdout:
                logger.info(f"Migration output: {result.stdout}")
        else:
            logger.error(f"Alembic migration failed: {result.stderr}")
            # Don't raise - let the app start anyway
    except Exception as e:
        logger.error(f"Error running migrations: {e}")
        # Don't raise - let the app start anyway

# Run migrations on module load
run_migrations()

app = FastAPI(
    title="Contract Management API",
    description="API für die Verwaltung von Verträgen und Provisionsberechnungen",
    version="1.0.46"
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
