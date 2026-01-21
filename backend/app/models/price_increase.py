from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from app.database import Base
from datetime import datetime
import uuid

class PriceIncrease(Base):
    __tablename__ = "price_increases"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Gültigkeitszeitraum
    valid_from = Column(DateTime, nullable=False, index=True)
    
    # Erhöhungen pro Betrag-Typ (stored as JSONB with key-value pairs)
    # Example: { "software_rental": 5.0, "software_care": 3.0, "apps": 2.0, "purchase": 1.0 }
    amount_increases = Column(JSONB, default={
        "software_rental": 0,
        "software_care": 0,
        "apps": 0,
        "purchase": 0
    })
    
    # Bestandsschutz
    lock_in_months = Column(Integer, default=24)
    
    description = Column(String, default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
