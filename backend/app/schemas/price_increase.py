from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Dict, Optional

# PriceIncrease Schemas
class PriceIncreaseBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    valid_from: datetime
    # Amount increases per type (in %)
    amount_increases: Dict[str, float] = {
        "software_rental": 0,
        "software_care": 0,
        "apps": 0,
        "purchase": 0
    }
    lock_in_months: int = 24
    description: str = ""

class PriceIncreaseCreate(PriceIncreaseBase):
    pass

class PriceIncreaseUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
    
    valid_from: Optional[datetime] = None
    amount_increases: Optional[Dict[str, float]] = None
    lock_in_months: Optional[int] = None
    description: Optional[str] = None

class PriceIncrease(PriceIncreaseBase):
    id: str
    created_at: datetime
    updated_at: datetime
