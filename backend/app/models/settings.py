from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from app.database import Base
from datetime import datetime

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default="default")
    
    # Existenzgründer
    founder_delay_months = Column(Integer, default=12)
    
    # Provisionen nach Vertragstyp (stored as JSON)
    commission_rates = Column(JSON, default={"rental": 10.0, "software-care": 10.0})
    
    # Post-Contract Provisionen (stored as JSON)
    post_contract_months = Column(JSON, default={"rental": 12, "software-care": 12})
    
    # Exit-Calculation
    min_contract_months_for_payout = Column(Integer, default=60)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
