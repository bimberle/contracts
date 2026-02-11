from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contract import Contract
from app.models.customer import Customer
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.models.settings import Settings
from app.schemas.contract import Contract as ContractSchema, ContractCreate, ContractUpdate, ContractMetrics
from app.services.metrics import calculate_contract_metrics
from datetime import datetime

router = APIRouter(tags=["contracts"])

@router.get("", response_model=List[ContractSchema])
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

@router.post("", response_model=ContractSchema, status_code=status.HTTP_201_CREATED)
def create_contract(contract: ContractCreate, db: Session = Depends(get_db)):
    """Erstellt einen neuen Vertrag"""
    # Prüfe ob Kunde existiert
    customer = db.query(Customer).filter(Customer.id == contract.customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    # Konvertiere CHF zu EUR wenn nötig
    contract_data = contract.dict()
    CHF_TO_EUR_RATE = 0.95
    
    if contract_data.get('currency') == 'CHF':
        # Konvertiere alle Beträge von CHF zu EUR
        contract_data['software_rental_amount'] = contract_data.get('software_rental_amount', 0) * CHF_TO_EUR_RATE
        contract_data['software_care_amount'] = contract_data.get('software_care_amount', 0) * CHF_TO_EUR_RATE
        contract_data['apps_amount'] = contract_data.get('apps_amount', 0) * CHF_TO_EUR_RATE
        contract_data['purchase_amount'] = contract_data.get('purchase_amount', 0) * CHF_TO_EUR_RATE
        # Speichere als EUR
        contract_data['currency'] = 'EUR'
    
    db_contract = Contract(**contract_data)
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
    
    # Konvertiere CHF zu EUR wenn nötig
    CHF_TO_EUR_RATE = 0.95
    
    if update_data.get('currency') == 'CHF':
        # Konvertiere alle Beträge von CHF zu EUR
        if 'software_rental_amount' in update_data:
            update_data['software_rental_amount'] = update_data['software_rental_amount'] * CHF_TO_EUR_RATE
        if 'software_care_amount' in update_data:
            update_data['software_care_amount'] = update_data['software_care_amount'] * CHF_TO_EUR_RATE
        if 'apps_amount' in update_data:
            update_data['apps_amount'] = update_data['apps_amount'] * CHF_TO_EUR_RATE
        if 'purchase_amount' in update_data:
            update_data['purchase_amount'] = update_data['purchase_amount'] * CHF_TO_EUR_RATE
        # Speichere als EUR
        update_data['currency'] = 'EUR'
    
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
    from app.services.metrics import get_customer_first_contract_date
    
    db_contract = db.query(Contract).filter(Contract.id == contract_id).first()
    if not db_contract:
        raise HTTPException(status_code=404, detail="Vertrag nicht gefunden")
    
    # Lade alle notwendigen Daten
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).order_by(CommissionRate.valid_from).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    # Ermittle das erste Vertragsdatum des Kunden für Bestandsschutz
    customer_contracts = db.query(Contract).filter(Contract.customer_id == db_contract.customer_id).all()
    customer_first_contract_date = get_customer_first_contract_date(customer_contracts)
    
    metrics_dict = calculate_contract_metrics(
        contract=db_contract,
        settings=settings,
        price_increases=price_increases,
        commission_rates=commission_rates,
        today=datetime.utcnow(),
        customer_first_contract_date=customer_first_contract_date
    )
    
    # Konvertiere zu Pydantic Model für camelCase Serialisierung
    metrics = ContractMetrics(**metrics_dict)
    
    return {
        "status": "success",
        "data": metrics
    }
