from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional

# Customer Schemas
class CustomerBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    name: str
    ort: str
    plz: str
    kundennummer: str
    land: str = "Deutschland"

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    name: Optional[str] = None
    ort: Optional[str] = None
    plz: Optional[str] = None
    kundennummer: Optional[str] = None
    land: Optional[str] = None

class Customer(CustomerBase):
    id: str
    created_at: datetime
    updated_at: datetime

# Calculated Metrics
class CalculatedMetrics(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    customer_id: str
    total_monthly_rental: float
    total_monthly_commission: float
    total_earned: float
    exit_payout_if_today_in_months: float
    active_contracts: int
