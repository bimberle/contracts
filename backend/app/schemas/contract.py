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
    cloud_amount: float = 0            # Cloudkosten
    currency: str = "EUR"
    start_date: datetime  # Mietbeginn
    end_date: Optional[datetime] = None
    is_founder_discount: bool = False
    number_of_seats: int = 1  # Anzahl Arbeitsplätze für Exit-Zahlungen Staffel
    excluded_price_increase_ids: List[str] = []  # Price increase IDs that don't apply to this contract
    included_early_price_increase_ids: List[str] = []  # Early price increase IDs manually enabled for this contract
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
    cloud_amount: Optional[float] = None
    currency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_founder_discount: Optional[bool] = None
    number_of_seats: Optional[int] = None
    excluded_price_increase_ids: Optional[List[str]] = None
    included_early_price_increase_ids: Optional[List[str]] = None
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
    exit_payout: float


# Contract with Customer Info and Metrics (for search results)
class ContractWithDetails(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    # Contract fields
    id: str
    customer_id: str
    software_rental_amount: float
    software_care_amount: float
    apps_amount: float
    purchase_amount: float
    cloud_amount: float
    currency: str
    start_date: datetime
    end_date: Optional[datetime]
    number_of_seats: int
    is_founder_discount: bool
    excluded_price_increase_ids: List[str]
    included_early_price_increase_ids: List[str]
    notes: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Customer info
    customer_name: str
    customer_name2: Optional[str] = None
    plz: str
    ort: str
    kundennummer: Optional[str] = None
    land: Optional[str] = None
    
    # Metrics
    current_monthly_price: float
    current_monthly_commission: float
    exit_payout: float
    months_running: int
    
    # Zusätzliche Status-Infos
    is_in_founder_period: bool = False  # Ob in Existenzgründer-Phase
    is_future_contract: bool = False    # Ob Vertragsstart in der Zukunft
    active_from_date: Optional[datetime] = None  # Ab wann aktiv (für founder/future)


class ContractSearchResponse(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    contracts: List[ContractWithDetails]
    total: int
    total_revenue: float
    total_commission: float
    total_exit_payout: float
