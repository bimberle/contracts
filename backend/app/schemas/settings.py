from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Dict, Optional, List

# Exit Payout Tier (Staffel nach Arbeitsplätzen)
class ExitPayoutTier(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    min_seats: int
    max_seats: int
    months: int

# Exit Payout Type Config
class ExitPayoutTypeConfig(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    enabled: bool = True
    additional_months: int = 0

# Settings Schemas
class SettingsBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    founder_delay_months: int = 12
    post_contract_months: Dict[str, int] = {
        "software_rental": 12,
        "software_care": 12,
        "apps": 12,
        "purchase": 12
    }
    min_contract_months_for_payout: int = 60
    exit_payout_tiers: List[ExitPayoutTier] = [
        ExitPayoutTier(min_seats=1, max_seats=5, months=48),
        ExitPayoutTier(min_seats=6, max_seats=10, months=54)
    ]
    exit_payout_by_type: Dict[str, ExitPayoutTypeConfig] = {
        "software_rental": ExitPayoutTypeConfig(enabled=True, additional_months=12),
        "software_care": ExitPayoutTypeConfig(enabled=False, additional_months=0),
        "apps": ExitPayoutTypeConfig(enabled=True, additional_months=12),
        "purchase": ExitPayoutTypeConfig(enabled=True, additional_months=12),
        "cloud": ExitPayoutTypeConfig(enabled=False, additional_months=0)
    }
    personal_tax_rate: float = 42.0

class SettingsUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    
    founder_delay_months: Optional[int] = None
    post_contract_months: Optional[Dict[str, int]] = None
    min_contract_months_for_payout: Optional[int] = None
    exit_payout_tiers: Optional[List[ExitPayoutTier]] = None
    exit_payout_by_type: Optional[Dict[str, ExitPayoutTypeConfig]] = None
    personal_tax_rate: Optional[float] = None

class Settings(SettingsBase):
    id: str
    updated_at: datetime
