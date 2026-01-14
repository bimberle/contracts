from datetime import datetime
from typing import List, Dict
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.services.calculations import (
    get_current_monthly_commission,
    get_current_monthly_price
)
from app.utils.date_utils import add_months

def generate_forecast(
    contracts: List[Contract],
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates: List[CommissionRate],
    start_date: datetime,
    months: int = 12
) -> List[Dict]:
    """
    Generiert einen Provisions-Forecast für die nächsten X Monate
    """
    forecast = []
    current_date = start_date
    
    for month_offset in range(months):
        month_date = add_months(current_date, month_offset)
        
        total_revenue = 0.0
        total_commission = 0.0
        total_net_income = 0.0
        active_count = 0
        ending_count = 0
        
        for contract in contracts:
            # Berechne Umsatz mit Preiserhöhungen
            monthly_price = get_current_monthly_price(contract, price_increases, month_date)
            total_revenue += monthly_price
            
            commission = get_current_monthly_commission(
                contract, settings, price_increases, commission_rates, month_date
            )
            
            if commission > 0:
                total_commission += commission
                active_count += 1
            
            # Prüfe ob Vertrag in diesem Monat endet
            if contract.end_date:
                end_month_start = add_months(contract.end_date.replace(day=1), 0)
                if end_month_start == month_date.replace(day=1):
                    ending_count += 1
        
        # Berechne Netto-Einkommen basierend auf persönlichem Steuersatz
        total_net_income = round(total_commission * (1 - settings.personal_tax_rate / 100), 2)
        
        forecast.append({
            "date": month_date.strftime("%Y-%m"),
            "month_name": month_date.strftime("%B %Y"),
            "total_revenue": round(total_revenue, 2),
            "total_commission": round(total_commission, 2),
            "total_net_income": total_net_income,
            "active_contracts": active_count,
            "ending_contracts": ending_count
        })
    
    return forecast

def calculate_forecast_kpis(forecast: List[Dict]) -> Dict:
    """
    Berechnet KPIs für den Forecast
    """
    if not forecast:
        return {
            "average": 0.0,
            "highest": 0.0,
            "lowest": 0.0,
            "trend": "stable"
        }
    
    commissions = [month["total_commission"] for month in forecast]
    average = sum(commissions) / len(commissions)
    highest = max(commissions)
    lowest = min(commissions)
    
    # Einfacher Trend: Vergleiche erste und letzte Hälfte
    first_half_avg = sum(commissions[:len(commissions)//2]) / (len(commissions)//2)
    second_half_avg = sum(commissions[len(commissions)//2:]) / (len(commissions) - len(commissions)//2)
    
    if second_half_avg > first_half_avg * 1.05:
        trend = "increasing"
    elif second_half_avg < first_half_avg * 0.95:
        trend = "decreasing"
    else:
        trend = "stable"
    
    return {
        "average": round(average, 2),
        "highest": round(highest, 2),
        "lowest": round(lowest, 2),
        "trend": trend
    }
