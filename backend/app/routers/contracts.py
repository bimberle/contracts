from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contract import Contract
from app.models.customer import Customer
from app.models.price_increase import PriceIncrease
from app.models.settings import Settings
from app.schemas.contract import Contract as ContractSchema, ContractCreate, ContractUpdate
from app.services.metrics import calculate_contract_metrics
from datetime import datetime

router = APIRouter(tags=["contracts"])

@router.get("/", response_model=List[ContractSchema])
def list_contracts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Ruft alle Verträge auf"""
    contracts = db.query(Contract).offset(skip).limit(limit).all()
    return contracts

@router.get("/customer/{customer_id}", response_model=List[ContractSchema])
def get_contracts_by_customer(customer_id: str, db: Session = Depends(get_db)):
    """Ruft alle Verträge eines Kunden auf"""
    # Prüfe ob Kunde existiert
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    contracts = db.query(Contract).filter(Contract.customer_id == customer_id).all()
    return contracts

@router.get("/{contract_id}", response_model=ContractSchema)
def get_contract(contract_id: str, db: Session = Depends(get_db)):
    """Ruft einen einzelnen Vertrag auf"""
    contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    return contract

@router.post("/", response_model=ContractSchema, status_code=status.HTTP_201_CREATED)
def create_contract(contract: ContractCreate, db: Session = Depends(get_db)):
    """Erstellt einen neuen Vertrag"""
    # Prüfe ob Kunde existiert
    customer = db.query(Customer).filter(Customer.id == contract.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    db_contract = Contract(**contract.dict())
    db.add(db_contract)
    db.commit()
    db.refresh(db_contract)
    return db_contract

@router.put("/{contract_id}", response_model=ContractSchema)
def update_contract(contract_id: str, contract_update: ContractUpdate, db: Session = Depends(get_db)):
    """Aktualisiert einen Vertrag"""
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    
    update_data = contract_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_contract, field, value)
    
    db.commit()
    db.refresh(db_contract)
    return db_contract

@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contract(contract_id: str, db: Session = Depends(get_db)):
    """Löscht einen Vertrag"""
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    
    db.delete(db_contract)
    db.commit()
    return None

@router.get("/{contract_id}/metrics")
def get_contract_metrics(contract_id: str, db: Session = Depends(get_db)):
    """Berechnet Metriken für einen Vertrag"""
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    
    # Lade alle notwendigen Daten
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    metrics = calculate_contract_metrics(
        contract=db_contract,
        settings=settings,
        price_increases=price_increases,
        today=datetime.utcnow()
    )
    
    return {
        "status": "success",
        "data": metrics
    }
