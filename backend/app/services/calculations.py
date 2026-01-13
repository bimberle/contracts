from datetime import datetime
from typing import List, Dict
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.utils.date_utils import months_between

def get_commission_rates_for_date(
    commission_rates_list: List[CommissionRate],
    date: datetime
) -> Dict[str, float]:
    """
    Findet die geltenden Provisionsätze für ein bestimmtes Datum
    Returns the most recent commission rate that is valid on or before the given date
    """
    # Keine Commission Rates verfügbar - Fallback zu Default
    if not commission_rates_list:
        return {
            "software_rental": 20.0,
            "software_care": 20.0,
            "apps": 20.0,
            "purchase": 0.083333
        }
    
    # Finde die neueste Commission Rate die auf oder vor dem Datum gültig ist
    applicable_rate = None
    for rate in sorted(commission_rates_list, key=lambda r: r.valid_from, reverse=True):
        if rate.valid_from <= date:
            applicable_rate = rate
            break
    
    if applicable_rate:
        return applicable_rate.rates
    else:
        # Fallback: Älteste Commission Rate (auch wenn sie in der Zukunft liegt)
        oldest_rate = min(commission_rates_list, key=lambda r: r.valid_from)
        return oldest_rate.rates

def get_current_monthly_price(
    contract: Contract,
    price_increases: List[PriceIncrease],
    date: datetime
) -> float:
    """
    Berechnet den aktuellen Gesamtpreis (Summe aller 4 Beträge mit Erhöhungen)
    Berücksichtigt:
    1. Alle gültigen Preiserhöhungen (pro Betrag-Typ)
    2. Bestandsschutz (lockInMonths)
    3. Datum der Anfrage
    
    Formel: total = sum(amount * (1 + applicable_increases))
    """
    # Basis-Beträge
    amounts = {
        'software_rental': contract.software_rental_amount,
        'software_care': contract.software_care_amount,
        'apps': contract.apps_amount,
        'purchase': contract.purchase_amount,
    }
    
    # Bestandsschutz prüfen
    months_running = months_between(contract.rental_start_date, date)
    
    # Preiserhöhungen anwenden pro Betrag-Typ
    for price_increase in price_increases:
        if price_increase.valid_from <= date:
            if months_running >= price_increase.lock_in_months:
                # Preiserhöhungen pro Betrag-Typ anwenden
                if price_increase.amount_increases:
                    for amount_type, increase_percent in price_increase.amount_increases.items():
                        if amount_type in amounts:
                            amounts[amount_type] *= (1 + increase_percent / 100)
    
    return sum(amounts.values())

def get_current_monthly_commission(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
    date: datetime
) -> float:
    """
    Berechnet die aktuelle monatliche Provision (Summe aller Betrag-Typen)
    """
    if contract.status.value != 'active':
        return 0.0
    
    # Berechne die aktuellen Preise pro Betrag-Typ mit Erhöhungen
    amounts = {
        'software_rental': contract.software_rental_amount,
        'software_care': contract.software_care_amount,
        'apps': contract.apps_amount,
        'purchase': contract.purchase_amount,
    }
    
    months_since_rental_start = months_between(contract.rental_start_date, date)
    
    # Noch in Gründerphase - keine Provision
    if months_since_rental_start < 0:
        return 0.0
    
    # Bestandsschutz für Preiserhöhungen prüfen
    months_running = months_since_rental_start
    
    # Preiserhöhungen anwenden
    for price_increase in price_increases:
        if price_increase.valid_from <= date:
            if months_running >= price_increase.lock_in_months:
                if price_increase.amount_increases:
                    for amount_type, increase_percent in price_increase.amount_increases.items():
                        if amount_type in amounts:
                            amounts[amount_type] *= (1 + increase_percent / 100)
    
    # Berechne Provisionen pro Betrag-Typ mit aktuellen Sätzen
    total_commission = 0.0
    commission_rates = get_commission_rates_for_date(commission_rates_list, date)
    
    for amount_type, amount in amounts.items():
        commission_rate = commission_rates.get(amount_type, 0)
        
        # Nach Vertragsende - prüfe postContractMonths
        if contract.end_date and date > contract.end_date:
            months_after_end = months_between(contract.end_date, date)
            post_contract_limit = settings.post_contract_months.get(amount_type, 0)
            if months_after_end > post_contract_limit:
                # Vertragsende + post-contract periode vorbei
                continue
        
        total_commission += amount * (commission_rate / 100)
    
    return total_commission

def calculate_earnings_to_date(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
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
            contract, settings, price_increases, commission_rates_list, current_date
        )
        total += commission
        current_date = add_months(current_date, 1)
    
    return total

def calculate_exit_payout(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
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
        contract, settings, price_increases, commission_rates_list, today
    )
    
    return monthly_commission * months_remaining
