from datetime import datetime
from typing import List, Dict
from sqlalchemy.orm import Session
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.services.calculations import (
    get_current_monthly_commission,
    calculate_earnings_to_date,
    calculate_exit_payout
)

def calculate_customer_metrics(
    customer_id: str,
    contracts: List[Contract],
    settings: Settings,
    price_increases: List[PriceIncrease],
    today: datetime
) -> Dict:
    """
    Berechnet alle Metriken für einen Kunden
    """
    total_monthly_rental = 0.0
    total_monthly_commission = 0.0
    total_earned = 0.0
    exit_payout = 0.0
    active_contracts = 0
    
    for contract in contracts:
        if contract.status.value == 'active':
            active_contracts += 1
            total_monthly_rental += contract.price
            
        monthly_commission = get_current_monthly_commission(
            contract, settings, price_increases, today
        )
        total_monthly_commission += monthly_commission
        
        earned = calculate_earnings_to_date(
            contract, settings, price_increases, today
        )
        total_earned += earned
        
        contract_exit_payout = calculate_exit_payout(
            contract, settings, price_increases, today
        )
        exit_payout += contract_exit_payout
    
    return {
        "customer_id": customer_id,
        "total_monthly_rental": round(total_monthly_rental, 2),
        "total_monthly_commission": round(total_monthly_commission, 2),
        "total_earned": round(total_earned, 2),
        "exit_payout_if_today": round(exit_payout, 2),
        "active_contracts": active_contracts
    }

def calculate_contract_metrics(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    today: datetime
) -> Dict:
    """
    Berechnet alle Metriken für einen Vertrag
    """
    from app.services.calculations import get_current_monthly_price
    from app.utils.date_utils import months_between
    
    current_monthly_price = get_current_monthly_price(contract, price_increases, today)
    months_running = months_between(contract.rental_start_date, today)
    is_in_founder_period = months_running < 0
    current_monthly_commission = get_current_monthly_commission(
        contract, settings, price_increases, today
    )
    earned_commission_to_date = calculate_earnings_to_date(
        contract, settings, price_increases, today
    )
    
    return {
        "contract_id": contract.id,
        "current_monthly_price": round(current_monthly_price, 2),
        "months_running": max(0, months_running),
        "is_in_founder_period": is_in_founder_period,
        "current_monthly_commission": round(current_monthly_commission, 2),
        "earned_commission_to_date": round(earned_commission_to_date, 2),
        "projected_monthly_commission": round(current_monthly_commission, 2)
    }
