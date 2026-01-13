from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from app.database import Base
from datetime import datetime

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default="default")
    
    # Existenzgründer
    founder_delay_months = Column(Integer, default=12)
    
    # Provisionen nach Betrag-Typ (stored as JSON)
    # New structure: commission_rates by amount type
    commission_rates = Column(JSON, default={
        "software_rental": 20.0,      # Software Miete: 20%
        "software_care": 20.0,         # Software Pflege: 20%
        "apps": 20.0,                  # Apps: 20%
        "purchase": 0.083333           # Kauf Bestandsvertrag: 1/12%
    })
    
    # Post-Contract Provisionen (stored as JSON)
    post_contract_months = Column(JSON, default={
        "software_rental": 12,
        "software_care": 12,
        "apps": 12,
        "purchase": 12
    })
    
    # Exit-Calculation
    min_contract_months_for_payout = Column(Integer, default=60)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
