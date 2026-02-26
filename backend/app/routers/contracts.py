from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contract import Contract
from app.models.customer import Customer
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.models.settings import Settings
from app.schemas.contract import Contract as ContractSchema, ContractCreate, ContractUpdate, ContractMetrics, ContractWithDetails, ContractSearchResponse
from app.services.metrics import calculate_contract_metrics
from datetime import datetime

router = APIRouter(tags=["contracts"])


@router.get("/search", response_model=ContractSearchResponse)
def search_contracts(
    search: str = "",
    sort_by: str = "customer",
    sort_direction: str = "asc",
    software_rental: bool = True,
    software_care: bool = True,
    apps: bool = True,
    purchase: bool = True,
    cloud: bool = True,
    skip: int = 0,
    limit: int = 1000,
    db: Session = Depends(get_db)
):
    """
    Sucht und filtert Verträge mit Kundeninformationen und Metriken.
    Berechnet alle Metriken in einem einzigen Aufruf für maximale Performance.
    """
    from app.services.metrics import calculate_contract_metrics, get_customer_first_contract_date
    from app.utils.date_utils import months_between
    from sqlalchemy import or_, func
    
    # Lade alle notwendigen Daten einmalig
    settings = db.query(Settings).filter(Settings.id == "default").first()
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).order_by(CommissionRate.valid_from).all()
    today = datetime.utcnow()
    
    # Basis-Query mit Customer-Join
    query = db.query(Contract, Customer).join(Customer, Contract.customer_id == Customer.id)
    
    # Suchfilter
    if search:
        search_term = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(Customer.name).like(search_term),
                func.lower(Customer.name2).like(search_term),
                func.lower(Customer.ort).like(search_term),
                Customer.plz.like(search_term),
                func.lower(Customer.kundennummer).like(search_term),
                func.lower(Customer.land).like(search_term)
            )
        )
    
    # Hole alle Ergebnisse für Filterung und Metriken-Berechnung
    all_results = query.all()
    
    # Gruppiere Verträge nach Kunde für Bestandsschutz-Berechnung
    customer_contracts: dict = {}
    for contract, customer in all_results:
        if customer.id not in customer_contracts:
            customer_contracts[customer.id] = []
        customer_contracts[customer.id].append(contract)
    
    # Berechne Metriken und baue Ergebnisliste
    contracts_with_details = []
    
    for contract, customer in all_results:
        # Prüfe Amount-Type-Filter
        all_filters_active = software_rental and software_care and apps and purchase and cloud
        
        if not all_filters_active:
            matches_filter = False
            if software_rental and contract.software_rental_amount != 0:
                matches_filter = True
            if software_care and contract.software_care_amount != 0:
                matches_filter = True
            if apps and contract.apps_amount != 0:
                matches_filter = True
            if purchase and contract.purchase_amount != 0:
                matches_filter = True
            if cloud and (contract.cloud_amount or 0) != 0:
                matches_filter = True
            
            if not matches_filter:
                continue
        
        # Berechne Metriken
        customer_first_contract_date = get_customer_first_contract_date(customer_contracts.get(customer.id, []))
        metrics = calculate_contract_metrics(
            contract=contract,
            settings=settings,
            price_increases=price_increases,
            commission_rates=commission_rates,
            today=today,
            customer_first_contract_date=customer_first_contract_date
        )
        
        contracts_with_details.append({
            "id": contract.id,
            "customer_id": contract.customer_id,
            "software_rental_amount": contract.software_rental_amount,
            "software_care_amount": contract.software_care_amount,
            "apps_amount": contract.apps_amount,
            "purchase_amount": contract.purchase_amount,
            "cloud_amount": contract.cloud_amount or 0,
            "currency": contract.currency,
            "start_date": contract.start_date,
            "end_date": contract.end_date,
            "is_founder_discount": contract.is_founder_discount,
            "number_of_seats": contract.number_of_seats or 1,
            "excluded_price_increase_ids": contract.excluded_price_increase_ids or [],
            "included_early_price_increase_ids": contract.included_early_price_increase_ids or [],
            "notes": contract.notes or "",
            "status": metrics.get("effective_status", contract.status.value if hasattr(contract.status, 'value') else contract.status),
            "created_at": contract.created_at,
            "updated_at": contract.updated_at,
            "customer_name": customer.name,
            "customer_name2": customer.name2,
            "plz": customer.plz or "",
            "ort": customer.ort or "",
            "kundennummer": customer.kundennummer,
            "land": customer.land,
            "current_monthly_price": metrics["current_monthly_price"],
            "current_monthly_commission": metrics["current_monthly_commission"],
            "exit_payout": metrics["exit_payout"],
            "months_running": metrics["months_running"],
            "is_in_founder_period": metrics.get("is_in_founder_period", False),
            "is_future_contract": metrics.get("is_future_contract", False),
            "active_from_date": metrics.get("active_from_date")
        })
    
    # Sortierung
    def get_sort_key(item):
        if sort_by == "customer":
            return item["customer_name"].lower()
        elif sort_by == "plz":
            return item["plz"]
        elif sort_by == "status":
            return item["status"]
        elif sort_by == "softwareRental":
            return item["software_rental_amount"]
        elif sort_by == "softwareCare":
            return item["software_care_amount"]
        elif sort_by == "apps":
            return item["apps_amount"]
        elif sort_by == "purchase":
            return item["purchase_amount"]
        elif sort_by == "cloud":
            return item["cloud_amount"]
        elif sort_by == "total":
            return item["current_monthly_price"]
        elif sort_by == "commission":
            return item["current_monthly_commission"]
        elif sort_by == "exit":
            return item["exit_payout"]
        return item["customer_name"].lower()
    
    contracts_with_details.sort(key=get_sort_key, reverse=(sort_direction == "desc"))
    
    # Berechne Gesamtsummen
    total_revenue = sum(c["current_monthly_price"] for c in contracts_with_details)
    total_commission = sum(c["current_monthly_commission"] for c in contracts_with_details)
    total_exit_payout = sum(c["exit_payout"] for c in contracts_with_details)
    total_count = len(contracts_with_details)
    
    # Pagination
    paginated = contracts_with_details[skip:skip + limit]
    
    return ContractSearchResponse(
        contracts=[ContractWithDetails(**c) for c in paginated],
        total=total_count,
        total_revenue=round(total_revenue, 2),
        total_commission=round(total_commission, 2),
        total_exit_payout=round(total_exit_payout, 2)
    )


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
