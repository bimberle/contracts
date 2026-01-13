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
    commission_rates: Dict[str, float] = {
        "software_rental": 20.0,      # Software Miete: 20%
        "software_care": 20.0,         # Software Pflege: 20%
        "apps": 20.0,                  # Apps: 20%
        "purchase": 0.083333           # Kauf Bestandsvertrag: 1/12%
    }
    post_contract_months: Dict[str, int] = {
        "software_rental": 12,
        "software_care": 12,
        "apps": 12,
        "purchase": 12
    }
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
