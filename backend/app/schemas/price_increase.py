from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

# PriceIncrease Schemas
class PriceIncreaseBase(BaseModel):
    valid_from: datetime
    factor: float
    lock_in_months: int = 24
    applies_to_types: List[str] = ["rental", "software-care"]
    description: str = ""

class PriceIncreaseCreate(PriceIncreaseBase):
    pass

class PriceIncreaseUpdate(BaseModel):
    valid_from: Optional[datetime] = None
    factor: Optional[float] = None
    lock_in_months: Optional[int] = None
    applies_to_types: Optional[List[str]] = None
    description: Optional[str] = None

class PriceIncrease(PriceIncreaseBase):
    id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
