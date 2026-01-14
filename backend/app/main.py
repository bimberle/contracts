from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app import models
import logging

logger = logging.getLogger(__name__)

# Create database tables on startup
def init_db():
    """Initialize database tables if they don't exist"""
    try:
        logger.info("Initializing database schema...")
        models.Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing database: {e}")
        raise

# Initialize database when app starts
init_db()

app = FastAPI(
    title="Contract Management API",
    description="API für die Verwaltung von Verträgen und Provisionsberechnungen",
    version="1.0.0"
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

# Import routers
from app.routers import customers, contracts, settings, price_increases, commission_rates, analytics, auth

# Include routers
app.include_router(auth.router)
app.include_router(customers.router, prefix="/api/customers")
app.include_router(contracts.router, prefix="/api/contracts")
app.include_router(settings.router, prefix="/api/settings")
app.include_router(price_increases.router, prefix="/api/price-increases")
app.include_router(commission_rates.router)
app.include_router(analytics.router, prefix="/api/analytics")
