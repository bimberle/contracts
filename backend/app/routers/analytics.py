from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contract import Contract
from app.models.customer import Customer
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.services.forecast import generate_forecast, calculate_forecast_kpis
from app.services.metrics import calculate_customer_metrics
from app.utils.date_utils import add_months
from datetime import datetime

router = APIRouter(tags=["analytics"])

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """Ruft die Dashboard-Übersicht auf"""
    customers = db.query(Customer).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    total_monthly_revenue = 0.0
    total_customers = len(customers)
    total_active_contracts = 0
    top_customers_data = []
    
    for customer in customers:
        contracts = db.query(Contract).filter(Contract.customer_id == customer.id).all()
        metrics = calculate_customer_metrics(
            customer_id=customer.id,
            contracts=contracts,
            settings=settings,
            price_increases=price_increases,
            today=datetime.utcnow()
        )
        
        total_monthly_revenue += metrics["total_monthly_commission"]
        total_active_contracts += metrics["active_contracts"]
        
        if metrics["total_monthly_commission"] > 0:
            top_customers_data.append({
                "customer_id": customer.id,
                "customer_name": customer.name,
                "monthly_commission": metrics["total_monthly_commission"]
            })
    
    # Top 5 Kunden nach Provision
    top_customers = sorted(
        top_customers_data,
        key=lambda x: x["monthly_commission"],
        reverse=True
    )[:5]
    
    average_commission = total_monthly_revenue / len(customers) if customers else 0.0
    
    return {
        "status": "success",
        "data": {
            "total_customers": total_customers,
            "total_monthly_revenue": round(total_monthly_revenue, 2),
            "total_active_contracts": total_active_contracts,
            "average_commission_per_customer": round(average_commission, 2),
            "top_customers": top_customers
        }
    }

@router.get("/forecast")
def get_forecast(months: int = 12, db: Session = Depends(get_db)):
    """Ruft den 12-Monats-Provisions-Forecast auf"""
    contracts = db.query(Contract).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    # Generiere Forecast
    start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    forecast_data = generate_forecast(
        contracts=contracts,
        settings=settings,
        price_increases=price_increases,
        start_date=start_date,
        months=min(months, 36)  # Max 36 Monate
    )
    
    # Berechne KPIs
    kpis = calculate_forecast_kpis(forecast_data)
    
    # Berechne Gesamtrevenue und kumulativen Wert
    cumulative = 0.0
    for month in forecast_data:
        cumulative += month["total_commission"]
        month["cumulative"] = round(cumulative, 2)
    
    return {
        "status": "success",
        "data": {
            "months": forecast_data,
            "kpis": kpis
        }
    }

@router.get("/customer/{customer_id}")
def get_customer_analytics(customer_id: str, db: Session = Depends(get_db)):
    """Ruft detaillierte Analysen für einen Kunden auf"""
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Kunde nicht gefunden")
    
    contracts = db.query(Contract).filter(Contract.customer_id == customer_id).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    # Kundenmetriken
    metrics = calculate_customer_metrics(
        customer_id=customer_id,
        contracts=contracts,
        settings=settings,
        price_increases=price_increases,
        today=datetime.utcnow()
    )
    
    # Vertrag-Details mit Metriken
    from app.services.metrics import calculate_contract_metrics
    contract_details = []
    for contract in contracts:
        contract_metrics = calculate_contract_metrics(
            contract=contract,
            settings=settings,
            price_increases=price_increases,
            today=datetime.utcnow()
        )
        contract_details.append({
            "id": contract.id,
            "title": contract.title,
            "type": contract.type.value,
            "status": contract.status.value,
            "price": contract.price,
            "metrics": contract_metrics
        })
    
    # Kundeninfo
    customer_info = {
        "id": customer.id,
        "name": customer.name,
        "kundennummer": customer.kundennummer,
        "ort": customer.ort,
        "plz": customer.plz,
        "land": customer.land
    }
    
    return {
        "status": "success",
        "data": {
            "customer": customer_info,
            "metrics": metrics,
            "contracts": contract_details
        }
    }
