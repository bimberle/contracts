from sqlalchemy import Column, String, Float, DateTime, JSON
from app.database import Base
from datetime import datetime
import uuid

class CommissionRate(Base):
    __tablename__ = "commission_rates"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Gültigkeitszeitraum - ab wann gelten diese Sätze?
    valid_from = Column(DateTime, nullable=False, index=True)
    
    # Provisionsätze pro Betrag-Typ (stored as JSON with key-value pairs)
    # Example: { "software_rental": 20.0, "software_care": 20.0, "apps": 20.0, "purchase": 10.0, "cloud": 10.0 }
    rates = Column(JSON, default={
        "software_rental": 20.0,
        "software_care": 20.0,
        "apps": 20.0,
        "purchase": 10.0,
        "cloud": 10.0
    })
    
    description = Column(String, default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
