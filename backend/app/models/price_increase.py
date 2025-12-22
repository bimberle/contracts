from sqlalchemy import Column, String, Float, Integer, DateTime, JSON
from app.database import Base
from datetime import datetime
import uuid

class PriceIncrease(Base):
    __tablename__ = "price_increases"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Gültigkeitszeitraum
    valid_from = Column(DateTime, nullable=False, index=True)
    factor = Column(Float, nullable=False)  # Erhöhung in % (z.B. 5 für +5%)
    
    # Bestandsschutz
    lock_in_months = Column(Integer, default=24)
    
    # Anwendung (stored as JSON array)
    applies_to_types = Column(JSON, default=["rental", "software-care"])
    
    description = Column(String, default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
