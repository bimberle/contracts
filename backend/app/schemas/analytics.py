from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing import List, Generic, TypeVar

# Dashboard Schemas
class TopCustomer(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    customer_id: str
    customer_name: str
    monthly_commission: float

class DashboardSummary(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    total_customers: int
    total_monthly_revenue: float
    total_monthly_commission: float
    total_monthly_net_income: float
    total_active_contracts: int
    average_commission_per_customer: float
    top_customers: List[TopCustomer]

# Forecast Schemas
class ForecastMonth(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    date: str  # Format: YYYY-MM
    month_name: str
    total_revenue: float
    total_commission: float
    total_net_income: float
    active_contracts: int
    ending_contracts: int
    cumulative: float
    cumulative_net_income: float

class Forecast(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    months: List[ForecastMonth]

# Generic Response Wrapper
T = TypeVar('T')

class ApiResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    status: str
    data: T
    message: str | None = None


