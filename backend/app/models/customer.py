from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime
import uuid

class Customer(Base):
    __tablename__ = "customers"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    name2 = Column(String, nullable=True, index=True)
    ort = Column(String, nullable=False)
    plz = Column(String, nullable=False)
    kundennummer = Column(String, unique=True, nullable=False, index=True)
    land = Column(String, nullable=False, default="Deutschland")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contracts = relationship("Contract", back_populates="customer", cascade="all, delete-orphan")
