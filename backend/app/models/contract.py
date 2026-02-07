from sqlalchemy import Column, String, Float, DateTime, Boolean, ForeignKey, Enum, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid
import enum

class ContractStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    COMPLETED = "completed"

class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    customer_id = Column(String, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Finanzielle Details - 5 Beträge
    software_rental_amount = Column(Float, default=0)  # Software Miete
    software_care_amount = Column(Float, default=0)    # Software Pflege
    apps_amount = Column(Float, default=0)             # Apps
    purchase_amount = Column(Float, default=0)         # Kauf Bestandsvertrag
    cloud_amount = Column(Float, default=0)            # Cloudkosten
    currency = Column(String, default="EUR")
    
    # Zeitliche Details
    start_date = Column(DateTime, nullable=False)  # Mietbeginn
    end_date = Column(DateTime, nullable=True)
    
    # Existenzgründer-Flag
    is_founder_discount = Column(Boolean, default=False)
    
    # Preiserhöhungen die für diesen Vertrag nicht gelten (list of price_increase IDs)
    excluded_price_increase_ids = Column(JSON, default=[])
    
    # Frühere Preiserhöhungen die für diesen Vertrag manuell aktiviert wurden (list of price_increase IDs)
    # Diese werden normalerweise wegen Bestandsschutz oder Startdatum nicht angewendet
    included_early_price_increase_ids = Column(JSON, default=[])
    
    notes = Column(String, default="")
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    customer = relationship("Customer", back_populates="contracts")
    
    @property
    def status(self):
        """Status wird automatisch basierend auf end_date berechnet"""
        if self.end_date and datetime.utcnow() > self.end_date:
            return ContractStatus.COMPLETED
        return ContractStatus.ACTIVE


