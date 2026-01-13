from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional
from app.models.contract import ContractType, ContractStatus

# Contract Schemas
class ContractBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    customer_id: str
    type: ContractType
    software_rental_amount: float = 0  # Software Miete
    software_care_amount: float = 0    # Software Pflege
    apps_amount: float = 0             # Apps
    purchase_amount: float = 0         # Kauf Bestandsvertrag
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
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    type: Optional[ContractType] = None
    software_rental_amount: Optional[float] = None
    software_care_amount: Optional[float] = None
    apps_amount: Optional[float] = None
    purchase_amount: Optional[float] = None
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

# Contract Metrics
class ContractMetrics(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    contract_id: str
    current_monthly_price: float
    months_running: int
    is_in_founder_period: bool
    current_monthly_commission: float
    earned_commission_to_date: float
    projected_monthly_commission: float
