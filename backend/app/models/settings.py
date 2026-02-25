from sqlalchemy import Column, String, Integer, Float, DateTime, JSON
from app.database import Base
from datetime import datetime

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(String, primary_key=True, default="default")
    
    # Existenzgründer
    founder_delay_months = Column(Integer, default=12)
    
    # Post-Contract Provisionen (stored as JSON)
    # Anzahl der Monate nach Vertragsende, in denen noch Provision gezahlt wird
    post_contract_months = Column(JSON, default={
        "software_rental": 12,
        "software_care": 12,
        "apps": 12,
        "purchase": 12
    })
    
    # Exit-Calculation
    # Minimale Vertragslaufzeit in Monaten, um volle Auszahlung zu erhalten
    min_contract_months_for_payout = Column(Integer, default=60)
    
    # Exit-Zahlungen Staffel nach Arbeitsplätzen
    # Format: [{"min_seats": 1, "max_seats": 5, "months": 48}, {"min_seats": 6, "max_seats": 10, "months": 54}]
    exit_payout_tiers = Column(JSON, default=[
        {"min_seats": 1, "max_seats": 5, "months": 48},
        {"min_seats": 6, "max_seats": 10, "months": 54}
    ])
    
    # Exit-Zahlungen pro Vertragstyp (ob überhaupt Exit-Zahlungen gibt und wie viele zusätzliche Monate)
    # Format: {"software_rental": {"enabled": true, "additional_months": 12}, ...}
    exit_payout_by_type = Column(JSON, default={
        "software_rental": {"enabled": True, "additional_months": 12},
        "software_care": {"enabled": False, "additional_months": 0},
        "apps": {"enabled": True, "additional_months": 12},
        "purchase": {"enabled": True, "additional_months": 12},
        "cloud": {"enabled": False, "additional_months": 0}
    })
    
    # Personal Tax Rate
    # Persönlicher Steuersatz in % (z.B. 42 für 42%)
    personal_tax_rate = Column(Float, default=42.0)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
