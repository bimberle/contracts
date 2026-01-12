from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.schemas.contract import Contract, ContractCreate, ContractUpdate
from app.schemas.settings import Settings, SettingsUpdate
from app.schemas.price_increase import PriceIncrease, PriceIncreaseCreate, PriceIncreaseUpdate
from app.schemas.analytics import DashboardSummary, TopCustomer, Forecast, ForecastMonth

__all__ = [
    "Customer", "CustomerCreate", "CustomerUpdate",
    "Contract", "ContractCreate", "ContractUpdate",
    "Settings", "SettingsUpdate",
    "PriceIncrease", "PriceIncreaseCreate", "PriceIncreaseUpdate",
    "DashboardSummary", "TopCustomer", "Forecast", "ForecastMonth"
]
