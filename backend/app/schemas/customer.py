from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel
from datetime import datetime
from typing import Optional

# Customer Schemas
class CustomerBase(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    name: str = Field(..., min_length=1, description="Name des Kunden (Vorname)")
    name2: Optional[str] = Field(None, description="Name des Kunden (Nachname)")
    ort: str = Field(..., min_length=1, description="Stadt/Ort")
    plz: str = Field(..., description="Postleitzahl (nur numerisch)")
    kundennummer: str = Field(..., description="Kundennummer (nur numerisch)")
    land: str = Field(default="Deutschland", description="Land")
    
    @field_validator('plz')
    @classmethod
    def validate_plz(cls, v):
        if not v.isdigit():
            raise ValueError('Postleitzahl darf nur Ziffern enthalten')
        if len(v) < 1 or len(v) > 10:
            raise ValueError('Postleitzahl muss zwischen 1 und 10 Ziffern enthalten')
        return v
    
    @field_validator('kundennummer')
    @classmethod
    def validate_kundennummer(cls, v):
        if not v.isdigit():
            raise ValueError('Kundennummer darf nur Ziffern enthalten')
        # Pad to 8 digits if shorter
        if len(v) > 8:
            raise ValueError('Kundennummer darf maximal 8 Ziffern enthalten')
        return v.zfill(8)

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )
    
    name: Optional[str] = None
    name2: Optional[str] = None
    ort: Optional[str] = None
    plz: Optional[str] = None
    kundennummer: Optional[str] = None
    land: Optional[str] = None
    
    @field_validator('plz')
    @classmethod
    def validate_plz(cls, v):
        if v is not None:
            if not v.isdigit():
                raise ValueError('Postleitzahl darf nur Ziffern enthalten')
            if len(v) < 1 or len(v) > 10:
                raise ValueError('Postleitzahl muss zwischen 1 und 10 Ziffern enthalten')
        return v
    
    @field_validator('kundennummer')
    @classmethod
    def validate_kundennummer(cls, v):
        if v is not None:
            if not v.isdigit():
                raise ValueError('Kundennummer darf nur Ziffern enthalten')
            if len(v) > 8:
                raise ValueError('Kundennummer darf maximal 8 Ziffern enthalten')
            return v.zfill(8)
        return v

class Customer(CustomerBase):
    id: str
    created_at: datetime
    updated_at: datetime

# Calculated Metrics
class CalculatedMetrics(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )
    
    customer_id: str
    total_monthly_rental: float
    total_monthly_revenue: float
    total_monthly_commission: float
    total_monthly_net_income: float
    total_earned: float
    exit_payout_if_today_in_months: float
    active_contracts: int
