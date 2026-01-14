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
    post_contract_months: Dict[str, int] = {
        "software_rental": 12,
        "software_care": 12,
        "apps": 12,
        "purchase": 12
    }
    min_contract_months_for_payout: int = 60
    personal_tax_rate: float = 42.0

class SettingsUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    
    founder_delay_months: Optional[int] = None
    post_contract_months: Optional[Dict[str, int]] = None
    min_contract_months_for_payout: Optional[int] = None
    personal_tax_rate: Optional[float] = None

class Settings(SettingsBase):
    id: str
    updated_at: datetime
