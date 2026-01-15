from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional, List

# Contract Schemas
class ContractBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    customer_id: str
    software_rental_amount: float = 0  # Software Miete
    software_care_amount: float = 0    # Software Pflege
    apps_amount: float = 0             # Apps
    purchase_amount: float = 0         # Kauf Bestandsvertrag (Monatliche Softwarepflege Kauf)
    currency: str = "EUR"
    start_date: datetime  # Mietbeginn
    end_date: Optional[datetime] = None
    is_founder_discount: bool = False
    excluded_price_increase_ids: List[str] = []  # Price increase IDs that don't apply to this contract
    notes: str = ""

class ContractCreate(ContractBase):
    pass

class ContractUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    software_rental_amount: Optional[float] = None
    software_care_amount: Optional[float] = None
    apps_amount: Optional[float] = None
    purchase_amount: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_founder_discount: Optional[bool] = None
    excluded_price_increase_ids: Optional[List[str]] = None
    notes: Optional[str] = None

class Contract(ContractBase):
    id: str
    status: str  # Computed from end_date
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
