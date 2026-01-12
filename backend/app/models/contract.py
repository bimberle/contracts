from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid
import enum

class ContractType(str, enum.Enum):
    RENTAL = "rental"
    SOFTWARE_CARE = "software-care"

class ContractStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Beschreibung & Typ
    title = Column(String, nullable=False)
    type = Column(Enum(ContractType), nullable=False)
    
    # Finanzielle Details
    fixed_price = Column(Float, nullable=False)
    adjustable_price = Column(Float, nullable=False)
    currency = Column(String, default="EUR")
    
    # Zeitliche Details
    start_date = Column(DateTime, nullable=False)
    rental_start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    
    # Existenzgründer-Flag
    is_founder_discount = Column(Boolean, default=False)
    
    # Status
    status = Column(Enum(ContractStatus), default=ContractStatus.ACTIVE)
    notes = Column(String, default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship("Customer", back_populates="contracts")
