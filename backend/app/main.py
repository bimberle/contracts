from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine
from app import models

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Contract Management API",
    description="API für die Verwaltung von Verträgen und Provisionsberechnungen",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
from app.routers import customers, contracts, settings, price_increases, analytics

# Include routers
app.include_router(customers.router, prefix="/api/customers")
app.include_router(contracts.router, prefix="/api/contracts")
app.include_router(settings.router, prefix="/api/settings")
app.include_router(price_increases.router, prefix="/api/price-increases")
app.include_router(analytics.router, prefix="/api/analytics")
