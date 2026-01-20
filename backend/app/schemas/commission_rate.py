from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional

def to_camel(field_name: str) -> str:
    """Convert snake_case to camelCase"""
    components = field_name.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

class CommissionRateBase(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    valid_from: datetime
    rates: dict[str, float] = Field(
        default={
            "software_rental": 20.0,
            "software_care": 20.0,
            "apps": 20.0,
            "purchase": 10.0
        }
    )
    description: Optional[str] = None

class CommissionRateCreate(CommissionRateBase):
    pass

class CommissionRateUpdate(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    valid_from: Optional[datetime] = None
    rates: Optional[dict[str, float]] = None
    description: Optional[str] = None

class CommissionRate(CommissionRateBase):
    id: str
    created_at: datetime
    updated_at: datetime
