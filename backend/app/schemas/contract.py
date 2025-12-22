from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models.contract import ContractType, ContractStatus

# Contract Schemas
class ContractBase(BaseModel):
    customer_id: str
    title: str
    type: ContractType
    price: float
    currency: str = "EUR"
    start_date: datetime
    rental_start_date: datetime
    end_date: Optional[datetime] = None
    is_founder_discount: bool = False
    status: ContractStatus = ContractStatus.ACTIVE
    notes: str = ""

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    title: Optional[str] = None
    type: Optional[ContractType] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    rental_start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_founder_discount: Optional[bool] = None
    status: Optional[ContractStatus] = None
    notes: Optional[str] = None

class Contract(ContractBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
