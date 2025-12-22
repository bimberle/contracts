from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.settings import Settings
from app.schemas.settings import Settings as SettingsSchema, SettingsUpdate
from datetime import datetime

router = APIRouter(tags=["settings"])

@router.get("/", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    """Ruft die aktuellen Einstellungen auf"""
    settings = db.query(Settings).filter(Settings.id == "default").first()
    
    if not settings:
        # Erstelle Standard-Einstellungen wenn nicht vorhanden
        settings = Settings(
            id="default",
            founder_delay_months=12,
            commission_rates={"rental": 10.0, "software-care": 10.0},
            post_contract_months={"rental": 12, "software-care": 12},
            min_contract_months_for_payout=60
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    
    return settings

@router.put("/", response_model=SettingsSchema)
def update_settings(settings_update: SettingsUpdate, db: Session = Depends(get_db)):
    """Aktualisiert die Einstellungen"""
    db_settings = db.query(Settings).filter(Settings.id == "default").first()
    
    if not db_settings:
        # Erstelle Standard-Einstellungen wenn nicht vorhanden
        db_settings = Settings(
            id="default",
            founder_delay_months=12,
            commission_rates={"rental": 10.0, "software-care": 10.0},
            post_contract_months={"rental": 12, "software-care": 12},
            min_contract_months_for_payout=60
        )
        db.add(db_settings)
    
    update_data = settings_update.dict(exclude_unset=True)
    
    # Merge dicts für commission_rates und post_contract_months
    if "commission_rates" in update_data:
        if db_settings.commission_rates is None:
            db_settings.commission_rates = {}
        db_settings.commission_rates.update(update_data["commission_rates"])
        del update_data["commission_rates"]
    
    if "post_contract_months" in update_data:
        if db_settings.post_contract_months is None:
            db_settings.post_contract_months = {}
        db_settings.post_contract_months.update(update_data["post_contract_months"])
        del update_data["post_contract_months"]
    
    # Update andere Felder
    for field, value in update_data.items():
        setattr(db_settings, field, value)
    
    db_settings.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_settings)
    return db_settings
