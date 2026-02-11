from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.models.commission_rate import CommissionRate as CommissionRateModel
from app.schemas.commission_rate import CommissionRate, CommissionRateCreate, CommissionRateUpdate

router = APIRouter(prefix="/api/commission-rates", tags=["commission-rates"])

@router.get("", response_model=list[CommissionRate])
async def get_commission_rates(db: Session = Depends(get_db)):
    """Get all commission rates, ordered by valid_from (newest first)"""
    rates = db.query(CommissionRateModel).order_by(
        CommissionRateModel.valid_from.desc()
    ).all()
    return rates

@router.get("/{rate_id}", response_model=CommissionRate)
async def get_commission_rate(rate_id: str, db: Session = Depends(get_db)):
    """Get a specific commission rate"""
    rate = db.query(CommissionRateModel).filter(CommissionRateModel.id == rate_id).first()
    if not rate:
        raise HTTPException(status_code=404, detail="Commission rate not found")
    return rate

@router.post("", response_model=CommissionRate)
async def create_commission_rate(rate: CommissionRateCreate, db: Session = Depends(get_db)):
    """Create a new commission rate"""
    # Check if a rate already exists for this date (or later)
    existing = db.query(CommissionRateModel).filter(
        CommissionRateModel.valid_from <= rate.valid_from
    ).order_by(CommissionRateModel.valid_from.desc()).first()
    
    # We allow creating rates at any date, but warn if there's overlap
    db_rate = CommissionRateModel(
        valid_from=rate.valid_from,
        rates=rate.rates,
        description=rate.description or ""
    )
    db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate

@router.put("/{rate_id}", response_model=CommissionRate)
async def update_commission_rate(
    rate_id: str, 
    rate: CommissionRateUpdate, 
    db: Session = Depends(get_db)
):
    """Update a commission rate"""
    db_rate = db.query(CommissionRateModel).filter(CommissionRateModel.id == rate_id).first()
    if not db_rate:
        raise HTTPException(status_code=404, detail="Commission rate not found")
    
    # Update fields
    if rate.valid_from is not None:
        db_rate.valid_from = rate.valid_from
    if rate.rates is not None:
        db_rate.rates = rate.rates
    if rate.description is not None:
        db_rate.description = rate.description
    
    db_rate.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_rate)
    return db_rate

@router.delete("/{rate_id}")
async def delete_commission_rate(rate_id: str, db: Session = Depends(get_db)):
    """Delete a commission rate"""
    db_rate = db.query(CommissionRateModel).filter(CommissionRateModel.id == rate_id).first()
    if not db_rate:
        raise HTTPException(status_code=404, detail="Commission rate not found")
    
    db.delete(db_rate)
    db.commit()
    return {"status": "success", "message": "Commission rate deleted"}

@router.get("/effective/{date_str}", response_model=CommissionRate)
async def get_effective_commission_rate(date_str: str, db: Session = Depends(get_db)):
    """Get the commission rate that is effective on a given date (ISO format: YYYY-MM-DD)"""
    try:
        target_date = datetime.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Find the most recent rate that is valid on or before the target date
    rate = db.query(CommissionRateModel).filter(
        CommissionRateModel.valid_from <= target_date
    ).order_by(CommissionRateModel.valid_from.desc()).first()
    
    if not rate:
        raise HTTPException(status_code=404, detail="No commission rate found for this date")
    
    return rate
