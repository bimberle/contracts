from pydantic import BaseModel
from datetime import datetime
from typing import Optional

# Customer Schemas
class CustomerBase(BaseModel):
    name: str
    ort: str
    plz: str
    kundennummer: str
    land: str = "Deutschland"

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    ort: Optional[str] = None
    plz: Optional[str] = None
    kundennummer: Optional[str] = None
    land: Optional[str] = None

class Customer(CustomerBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
