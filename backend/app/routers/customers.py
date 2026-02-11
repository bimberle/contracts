from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.customer import Customer
from app.models.contract import Contract
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.models.settings import Settings
from app.schemas.customer import Customer as CustomerSchema, CustomerCreate, CustomerUpdate, CalculatedMetrics
from app.services.metrics import calculate_customer_metrics
from datetime import datetime

router = APIRouter(tags=["customers"])

@router.get("", response_model=List[CustomerSchema])
def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Ruft alle Kunden auf"""
    customers = db.query(Customer).offset(skip).limit(limit).all()
    return customers

@router.get("/{customer_id}", response_model=CustomerSchema)
def get_customer(customer_id: str, db: Session = Depends(get_db)):
    """Ruft einen einzelnen Kunden auf"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    return customer

@router.post("", response_model=CustomerSchema, status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate, db: Session = Depends(get_db)):
    """Erstellt einen neuen Kunden"""
    # Prüfe ob Kundennummer schon existiert
    existing = db.query(Customer).filter(Customer.kundennummer == customer.kundennummer).first()
    if existing:
        raise HTTPException(status_code=400, detail="Kundennummer existiert bereits")
    
    db_customer = Customer(**customer.model_dump(by_alias=False))
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.put("/{customer_id}", response_model=CustomerSchema)
def update_customer(customer_id: str, customer_update: CustomerUpdate, db: Session = Depends(get_db)):
    """Aktualisiert einen Kunden"""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Prüfe Kundennummer-Duplikat
    if customer_update.kundennummer and customer_update.kundennummer != db_customer.kundennummer:
        existing = db.query(Customer).filter(Customer.kundennummer == customer_update.kundennummer).first()
        if existing:
            raise HTTPException(status_code=400, detail="Kundennummer existiert bereits")
    
    update_data = customer_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    """Löscht einen Kunden (kaskadiert Verträge)"""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    db.delete(db_customer)
    db.commit()
    return None

@router.get("/{customer_id}/metrics")
def get_customer_metrics(customer_id: str, db: Session = Depends(get_db)):
    """Berechnet Metriken für einen Kunden"""
    db_customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not db_customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Lade alle notwendigen Daten
    contracts = db.query(Contract).filter(Contract.customer_id == customer_id).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).order_by(CommissionRate.valid_from).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    metrics_dict = calculate_customer_metrics(
        customer_id=customer_id,
        contracts=contracts,
        settings=settings,
        price_increases=price_increases,
        commission_rates=commission_rates,
        today=datetime.utcnow()
    )
    
    # Konvertiere zu Pydantic Model für camelCase Serialisierung
    metrics = CalculatedMetrics(**metrics_dict)
    
    return {
        "status": "success",
        "data": metrics
    }
