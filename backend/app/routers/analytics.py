from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.contract import Contract
from app.models.customer import Customer
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.services.forecast import generate_forecast, calculate_forecast_kpis
from app.services.metrics import calculate_customer_metrics
from app.schemas.analytics import DashboardSummary, TopCustomer, Forecast, ForecastMonth
from app.utils.date_utils import add_months
from datetime import datetime

router = APIRouter(tags=["analytics"])

@router.get("/dashboard", response_model=dict)
def get_dashboard(db: Session = Depends(get_db)):
    """Ruft die Dashboard-Übersicht auf"""
    customers = db.query(Customer).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    total_monthly_revenue = 0.0
    total_monthly_commission = 0.0
    total_exit_payout = 0.0
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
            commission_rates=commission_rates,
            today=datetime.utcnow()
        )
        
        total_monthly_revenue += metrics["total_monthly_revenue"]
        total_monthly_commission += metrics["total_monthly_commission"]
        total_exit_payout += metrics.get("total_exit_payout", 0.0)
        total_active_contracts += metrics["active_contracts"]
        
        if metrics["total_monthly_commission"] > 0:
            top_customers_data.append(TopCustomer(
                customer_id=customer.id,
                customer_name=customer.name,
                monthly_commission=metrics["total_monthly_commission"]
            ))
    
    # Top 3 Kunden nach Provision
    top_customers = sorted(
        top_customers_data,
        key=lambda x: x.monthly_commission,
        reverse=True
    )[:3]
    
    average_commission = total_monthly_commission / len(customers) if customers else 0.0
    total_monthly_net_income = total_monthly_commission * (1 - settings.personal_tax_rate / 100)
    total_exit_payout_net = total_exit_payout * (1 - settings.personal_tax_rate / 100)
    
    dashboard = DashboardSummary(
        total_customers=total_customers,
        total_monthly_revenue=round(total_monthly_revenue, 2),
        total_monthly_commission=round(total_monthly_commission, 2),
        total_monthly_net_income=round(total_monthly_net_income, 2),
        total_exit_payout=round(total_exit_payout, 2),
        total_exit_payout_net=round(total_exit_payout_net, 2),
        total_active_contracts=total_active_contracts,
        average_commission_per_customer=round(average_commission, 2),
        top_customers=top_customers
    )
    
    return {
        "status": "success",
        "data": dashboard
    }

@router.get("/forecast")
def get_forecast(months: int = 12, db: Session = Depends(get_db)):
    """Ruft den 12-Monats-Provisions-Forecast auf"""
    contracts = db.query(Contract).all()
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).order_by(CommissionRate.valid_from).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    # Generiere Forecast
    start_date = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    forecast_data = generate_forecast(
        contracts=contracts,
        settings=settings,
        price_increases=price_increases,
        commission_rates=commission_rates,
        start_date=start_date,
        months=min(months, 36)  # Max 36 Monate
    )
    
    # Berechne kumulativen Wert für Commission und Net Income
    cumulative_commission = 0.0
    cumulative_net_income = 0.0
    forecast_months = []
    for month in forecast_data:
        cumulative_commission += month["total_commission"]
        cumulative_net_income += month["total_net_income"]
        month["cumulative"] = round(cumulative_commission, 2)
        month["cumulative_net_income"] = round(cumulative_net_income, 2)
        forecast_months.append(ForecastMonth(**month))
    
    forecast = Forecast(months=forecast_months)
    
    return {
        "status": "success",
        "data": forecast
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
    commission_rates = db.query(CommissionRate).all()
    
    if not settings:
        raise HTTPException(status_code=500, detail="Einstellungen nicht konfiguriert")
    
    # Kundenmetriken
    metrics = calculate_customer_metrics(
        customer_id=customer_id,
        contracts=contracts,
        settings=settings,
        price_increases=price_increases,
        commission_rates=commission_rates,
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
            commission_rates=commission_rates,
            today=datetime.utcnow()
        )
        contract_details.append({
            "id": contract.id,
            "status": contract.status,
            "softwareRentalAmount": contract.software_rental_amount,
            "softwareCareAmount": contract.software_care_amount,
            "appsAmount": contract.apps_amount,
            "purchaseAmount": contract.purchase_amount,
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
