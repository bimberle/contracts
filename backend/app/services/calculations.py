from datetime import datetime
from typing import List
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.utils.date_utils import months_between

def get_current_monthly_price(
    contract: Contract,
    price_increases: List[PriceIncrease],
    date: datetime
) -> float:
    """
    Berechnet den aktuellen Gesamtpreis (fixed + adjustable mit Erhöhungen)
    Berücksichtigt:
    1. Alle gültigen Preiserhöhungen (nur auf adjustable_price)
    2. Bestandsschutz (lockInMonths)
    3. Datum der Anfrage
    
    Formel: total = fixed_price + (adjustable_price * (1 + sum(increases)))
    """
    adjustable_price = contract.adjustable_price
    
    for price_increase in price_increases:
        # Prüfe ob Preiserhöhung gültig ist
        if price_increase.valid_from <= date:
            # Prüfe ob Vertragstyp betroffen ist
            if contract.type.value in price_increase.applies_to_types:
                # Prüfe Bestandsschutz
                months_running = months_between(contract.rental_start_date, date)
                if months_running >= price_increase.lock_in_months:
                    adjustable_price *= (1 + price_increase.factor / 100)
    
    return contract.fixed_price + adjustable_price

def get_current_monthly_commission(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    date: datetime
) -> float:
    """
    Berechnet die aktuelle monatliche Provision
    """
    if contract.status.value != 'active':
        return 0.0
    
    current_price = get_current_monthly_price(contract, price_increases, date)
    commission_rate = settings.commission_rates.get(contract.type.value, 0)
    months_since_rental_start = months_between(contract.rental_start_date, date)
    
    # Noch in Gründerphase
    if months_since_rental_start < 0:
        return 0.0
    
    # Nach Vertragsende - prüfe postContractMonths
    if contract.end_date and date > contract.end_date:
        months_after_end = months_between(contract.end_date, date)
        post_contract_limit = settings.post_contract_months.get(contract.type.value, 0)
        if months_after_end <= post_contract_limit:
            return current_price * (commission_rate / 100)
        else:
            return 0.0
    
    return current_price * (commission_rate / 100)

def calculate_earnings_to_date(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    to_date: datetime
) -> float:
    """
    Addiert alle Provisionen vom Vertragsbeginn bis to_date
    Berücksichtigt alle Preiserhöhungen im Zeitraum
    """
    from app.utils.date_utils import add_months
    
    total = 0.0
    current_date = contract.rental_start_date
    
    while current_date <= to_date:
        commission = get_current_monthly_commission(
            contract, settings, price_increases, current_date
        )
        total += commission
        current_date = add_months(current_date, 1)
    
    return total

def calculate_exit_payout(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    today: datetime
) -> float:
    """
    Berechnet was bei Ausscheiden heute ausbezahlt würde
    """
    months_running = months_between(contract.rental_start_date, today)
    
    # Vertrag bereits beendet
    if contract.status.value == 'completed' or (contract.end_date and contract.end_date < today):
        return 0.0
    
    # Mindestdauer erfüllt, kein Ausgleich
    if months_running >= settings.min_contract_months_for_payout:
        return 0.0
    
    months_remaining = settings.min_contract_months_for_payout - months_running
    monthly_commission = get_current_monthly_commission(
        contract, settings, price_increases, today
    )
    
    return monthly_commission * months_remaining
