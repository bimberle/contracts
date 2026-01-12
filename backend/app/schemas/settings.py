from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Dict, Optional

# Settings Schemas
class SettingsBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    founder_delay_months: int = 12
    commission_rates: Dict[str, float] = {"rental": 10.0, "software-care": 10.0}
    post_contract_months: Dict[str, int] = {"rental": 12, "software-care": 12}
    min_contract_months_for_payout: int = 60

class SettingsUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    
    founder_delay_months: Optional[int] = None
    commission_rates: Optional[Dict[str, float]] = None
    post_contract_months: Optional[Dict[str, int]] = None
    min_contract_months_for_payout: Optional[int] = None

class Settings(SettingsBase):
    id: str
    updated_at: datetime
