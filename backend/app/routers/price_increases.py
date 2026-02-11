from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.price_increase import PriceIncrease
from app.schemas.price_increase import (
    PriceIncrease as PriceIncreaseSchema,
    PriceIncreaseCreate,
    PriceIncreaseUpdate
)

router = APIRouter(tags=["price-increases"])

@router.get("", response_model=List[PriceIncreaseSchema])
def list_price_increases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Ruft alle Preiserhöhungen auf"""
    price_increases = (
        db.query(PriceIncrease)
        .order_by(PriceIncrease.valid_from.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return price_increases

@router.get("/{price_increase_id}", response_model=PriceIncreaseSchema)
def get_price_increase(price_increase_id: str, db: Session = Depends(get_db)):
    """Ruft eine einzelne Preiserhöhung auf"""
    price_increase = (
        db.query(PriceIncrease)
        .filter(PriceIncrease.id == price_increase_id)
        .first()
    )
    if not price_increase:
        raise HTTPException(status_code=404, detail="Preiserhöhung nicht gefunden")
    return price_increase

@router.post("", response_model=PriceIncreaseSchema, status_code=status.HTTP_201_CREATED)
def create_price_increase(price_increase: PriceIncreaseCreate, db: Session = Depends(get_db)):
    """Erstellt eine neue Preiserhöhung"""
    db_price_increase = PriceIncrease(**price_increase.dict())
    db.add(db_price_increase)
    db.commit()
    db.refresh(db_price_increase)
    return db_price_increase

@router.put("/{price_increase_id}", response_model=PriceIncreaseSchema)
def update_price_increase(
    price_increase_id: str,
    price_increase_update: PriceIncreaseUpdate,
    db: Session = Depends(get_db)
):
    """Aktualisiert eine Preiserhöhung"""
    db_price_increase = (
        db.query(PriceIncrease)
        .filter(PriceIncrease.id == price_increase_id)
        .first()
    )
    if not db_price_increase:
        raise HTTPException(status_code=404, detail="Preiserhöhung nicht gefunden")
    
    update_data = price_increase_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_price_increase, field, value)
    
    db.commit()
    db.refresh(db_price_increase)
    return db_price_increase

@router.delete("/{price_increase_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_price_increase(price_increase_id: str, db: Session = Depends(get_db)):
    """Löscht eine Preiserhöhung"""
    db_price_increase = (
        db.query(PriceIncrease)
        .filter(PriceIncrease.id == price_increase_id)
        .first()
    )
    if not db_price_increase:
        raise HTTPException(status_code=404, detail="Preiserhöhung nicht gefunden")
    
    db.delete(db_price_increase)
    db.commit()
    return None
