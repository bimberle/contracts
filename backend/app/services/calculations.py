from datetime import datetime, date as date_type
from typing import List, Dict, Union, Tuple
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.utils.date_utils import months_between, add_months


def _to_date(d: Union[datetime, date_type]) -> date_type:
    """Konvertiert datetime zu date für Vergleiche"""
    if isinstance(d, datetime):
        return d.date()
    return d


def get_effective_status(
    contract: Contract,
    settings: Settings,
    today: datetime
) -> Tuple[str, datetime | None]:
    """
    Berechnet den effektiven Status eines Vertrags unter Berücksichtigung:
    - Existenzgründer-Schutz (founder_delay_months)
    - Vertragsstart in der Zukunft
    - Vertragsende
    
    Returns:
        Tuple[status, active_from_date]:
        - status: 'active', 'inactive', 'completed', 'founder'
        - active_from_date: Ab wann der Vertrag aktiv wird (für Existenzgründer/Zukunft)
    """
    # Vertrag beendet
    if contract.end_date and today > contract.end_date:
        return ('completed', None)
    
    # Berechne das effektive Startdatum
    effective_start = contract.start_date
    
    # Vertragsstart in der Zukunft
    if today < contract.start_date:
        return ('inactive', contract.start_date)
    
    # Existenzgründer-Schutz
    if contract.is_founder_discount:
        founder_delay = settings.founder_delay_months if settings else 12
        founder_end_date = add_months(contract.start_date, founder_delay)
        
        if today < founder_end_date:
            return ('founder', founder_end_date)
    
    return ('active', None)


def get_commission_rates_for_date(
    commission_rates_list: List[CommissionRate],
    date: Union[datetime, date_type]
) -> Dict[str, float]:
    """
    Findet die geltenden Provisionsätze für ein bestimmtes Datum
    Returns the most recent commission rate that is valid on or before the given date
    Uses snake_case keys for all rate dictionaries
    All rates are stored as percentages (e.g., 20 for 20%)
    """
    # Keine Commission Rates verfügbar - Fallback zu Default
    if not commission_rates_list:
        return {
            "software_rental": 20.0,
            "software_care": 20.0,
            "apps": 20.0,
            "purchase": 10.0,
            "cloud": 10.0
        }
    
    # Normalisiere das Datum für Vergleiche
    compare_date = _to_date(date)
    
    # Finde die neueste Commission Rate die auf oder vor dem Datum gültig ist
    applicable_rate = None
    for rate in sorted(commission_rates_list, key=lambda r: r.valid_from, reverse=True):
        rate_date = _to_date(rate.valid_from)
        if rate_date <= compare_date:
            applicable_rate = rate
            break
    
    if applicable_rate:
        # Convert camelCase keys to snake_case if needed
        rates_dict = applicable_rate.rates
        normalized_rates = _normalize_rate_keys(rates_dict)
        return normalized_rates
    else:
        # Fallback: Älteste Commission Rate (auch wenn sie in der Zukunft liegt)
        oldest_rate = min(commission_rates_list, key=lambda r: r.valid_from)
        normalized_rates = _normalize_rate_keys(oldest_rate.rates)
        return normalized_rates


def _normalize_rate_keys(rates: Dict[str, float]) -> Dict[str, float]:
    """
    Normalize rate keys from camelCase to snake_case
    Handles both camelCase (from API) and snake_case (from database) keys
    """
    camel_to_snake = {
        "softwareRental": "software_rental",
        "softwareCare": "software_care",
        "apps": "apps",
        "purchase": "purchase",
        "cloud": "cloud"
    }
    
    normalized = {}
    for key, value in rates.items():
        # If key is already snake_case, keep it
        # If key is camelCase, convert it
        if key in camel_to_snake:
            normalized[camel_to_snake[key]] = value
        elif key in camel_to_snake.values():
            # Already snake_case
            normalized[key] = value
        else:
            # Unknown key, try to match it
            normalized[key] = value
    
    return normalized

def get_current_monthly_price(
    contract: Contract,
    price_increases: List[PriceIncrease],
    date: datetime,
    customer_first_contract_date: datetime = None
) -> float:
    """
    Berechnet den aktuellen Gesamtpreis (Summe aller 4 Beträge mit Erhöhungen)
    Berücksichtigt:
    1. Alle gültigen Preiserhöhungen (pro Betrag-Typ)
    2. Bestandsschutz (lockInMonths) - basierend auf ERSTEM Kundenvertrag
    3. Datum der Anfrage
    
    Formel: total = sum(amount * (1 + applicable_increases))
    
    Args:
        customer_first_contract_date: Das Startdatum des ersten Vertrags des Kunden.
                                      Wird für die Bestandsschutz-Berechnung verwendet.
                                      Falls None, wird das Startdatum des aktuellen Vertrags verwendet.
    """
    # Basis-Beträge
    amounts = {
        'software_rental': contract.software_rental_amount,
        'software_care': contract.software_care_amount,
        'apps': contract.apps_amount,
        'purchase': contract.purchase_amount,
        'cloud': getattr(contract, 'cloud_amount', 0) or 0,
    }
    
    # Mapping von camelCase zu snake_case
    camel_to_snake = {
        'softwareRental': 'software_rental',
        'softwareCare': 'software_care',
        'apps': 'apps',
        'purchase': 'purchase',
        'cloud': 'cloud',
    }
    
    # Bestandsschutz prüfen - basierend auf erstem Kundenvertrag
    reference_date = customer_first_contract_date if customer_first_contract_date else contract.start_date
    
    # Get excluded price increase IDs for this contract
    excluded_ids = contract.excluded_price_increase_ids if hasattr(contract, 'excluded_price_increase_ids') else []
    
    # Get included early price increase IDs (manually activated)
    included_early_ids = contract.included_early_price_increase_ids if hasattr(contract, 'included_early_price_increase_ids') else []
    
    # Preiserhöhungen anwenden pro Betrag-Typ
    for price_increase in price_increases:
        # Skip if this price increase is excluded for this contract
        if price_increase.id in excluded_ids:
            continue
        
        # Check if this is a manually included early price increase
        is_manually_included = price_increase.id in included_early_ids
        
        # Preiserhöhung muss NACH dem Vertragsbeginn gültig werden
        # UNLESS it's manually included
        if price_increase.valid_from < contract.start_date and not is_manually_included:
            continue
            
        if price_increase.valid_from <= date:
            # Bestandsschutz: War der Kunde zum Zeitpunkt der Preiserhöhung (validFrom) bereits genug Monate Kunde?
            # Skip lock-in check for manually included price increases
            months_at_price_increase = months_between(reference_date, price_increase.valid_from)
            if months_at_price_increase >= price_increase.lock_in_months or is_manually_included:
                # Preiserhöhungen pro Betrag-Typ anwenden
                if price_increase.amount_increases:
                    for amount_type, increase_percent in price_increase.amount_increases.items():
                        # Normalisiere den Schlüssel (camelCase → snake_case)
                        normalized_key = camel_to_snake.get(amount_type, amount_type)
                        if normalized_key in amounts:
                            amounts[normalized_key] *= (1 + increase_percent / 100)
    
    return sum(amounts.values())

def get_current_monthly_commission(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
    date: datetime,
    customer_first_contract_date: datetime = None
) -> float:
    """
    Berechnet die aktuelle monatliche Provision (Summe aller Betrag-Typen)
    
    Args:
        customer_first_contract_date: Das Startdatum des ersten Vertrags des Kunden.
                                      Wird für die Bestandsschutz-Berechnung verwendet.
                                      Falls None, wird das Startdatum des aktuellen Vertrags verwendet.
    """
    if contract.status.value != 'active':
        return 0.0
    
    # Prüfe den effektiven Status (berücksichtigt Existenzgründer-Phase)
    effective_status, _ = get_effective_status(contract, settings, date)
    if effective_status != 'active':
        # Vertrag ist in Existenzgründer-Phase, in der Zukunft oder beendet
        return 0.0
    
    # Berechne die aktuellen Preise pro Betrag-Typ mit Erhöhungen
    amounts = {
        'software_rental': contract.software_rental_amount,
        'software_care': contract.software_care_amount,
        'apps': contract.apps_amount,
        'purchase': contract.purchase_amount,
        'cloud': getattr(contract, 'cloud_amount', 0) or 0,
    }
    
    # Mapping von camelCase zu snake_case
    camel_to_snake = {
        'softwareRental': 'software_rental',
        'softwareCare': 'software_care',
        'apps': 'apps',
        'purchase': 'purchase',
        'cloud': 'cloud',
    }
    
    # Bestandsschutz für Preiserhöhungen prüfen - basierend auf erstem Kundenvertrag
    reference_date = customer_first_contract_date if customer_first_contract_date else contract.start_date
    
    # Get excluded price increase IDs for this contract
    excluded_ids = contract.excluded_price_increase_ids if hasattr(contract, 'excluded_price_increase_ids') else []
    
    # Get included early price increase IDs (manually activated)
    included_early_ids = contract.included_early_price_increase_ids if hasattr(contract, 'included_early_price_increase_ids') else []
    
    # Preiserhöhungen anwenden
    for price_increase in price_increases:
        # Skip if this price increase is excluded for this contract
        if price_increase.id in excluded_ids:
            continue
        
        # Check if this is a manually included early price increase
        is_manually_included = price_increase.id in included_early_ids
        
        # Preiserhöhung muss NACH dem Vertragsbeginn gültig werden
        # UNLESS it's manually included
        if price_increase.valid_from < contract.start_date and not is_manually_included:
            continue
            
        if price_increase.valid_from <= date:
            # Bestandsschutz: War der Kunde zum Zeitpunkt der Preiserhöhung (validFrom) bereits genug Monate Kunde?
            # Skip lock-in check for manually included price increases
            months_at_price_increase = months_between(reference_date, price_increase.valid_from)
            if months_at_price_increase >= price_increase.lock_in_months or is_manually_included:
                if price_increase.amount_increases:
                    for amount_type, increase_percent in price_increase.amount_increases.items():
                        # Normalisiere den Schlüssel (camelCase → snake_case)
                        normalized_key = camel_to_snake.get(amount_type, amount_type)
                        if normalized_key in amounts:
                            amounts[normalized_key] *= (1 + increase_percent / 100)
    
    # Berechne Provisionen pro Betrag-Typ mit aktuellen Sätzen
    total_commission = 0.0
    commission_rates = get_commission_rates_for_date(commission_rates_list, date)
    
    for amount_type, amount in amounts.items():
        # Get the commission rate for this amount type
        # All keys are now normalized to snake_case
        commission_rate = commission_rates.get(amount_type, 0)
        
        # Nach Vertragsende - prüfe postContractMonths
        if contract.end_date and date > contract.end_date:
            months_after_end = months_between(contract.end_date, date)
            post_contract_limit = settings.post_contract_months.get(amount_type, 0)
            if months_after_end > post_contract_limit:
                # Vertragsende + post-contract periode vorbei
                continue
        
        # All rates (including purchase) are now stored as percentages
        total_commission += amount * (commission_rate / 100)
    
    return total_commission

def calculate_earnings_to_date(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
    to_date: datetime,
    customer_first_contract_date: datetime = None
) -> float:
    """
    Addiert alle Provisionen vom Vertragsbeginn bis to_date
    Berücksichtigt alle Preiserhöhungen im Zeitraum
    
    Args:
        customer_first_contract_date: Das Startdatum des ersten Vertrags des Kunden.
    """
    from app.utils.date_utils import add_months
    
    total = 0.0
    current_date = contract.start_date
    
    while current_date <= to_date:
        commission = get_current_monthly_commission(
            contract, settings, price_increases, commission_rates_list, current_date,
            customer_first_contract_date
        )
        total += commission
        current_date = add_months(current_date, 1)
    
    return total

def get_exit_payout_months(settings: Settings, number_of_seats: int) -> int:
    """
    Ermittelt die Anzahl der Exit-Zahlungs-Monate basierend auf der Arbeitsplätze-Staffel.
    
    Args:
        settings: Settings mit exit_payout_tiers
        number_of_seats: Anzahl der Arbeitsplätze im Vertrag
    
    Returns:
        Anzahl der Monate für Exit-Zahlung
    """
    tiers = settings.exit_payout_tiers if settings.exit_payout_tiers else []
    
    # Fallback auf min_contract_months_for_payout wenn keine Staffeln definiert
    if not tiers:
        return settings.min_contract_months_for_payout
    
    for tier in tiers:
        min_seats = tier.get('min_seats', 1)
        max_seats = tier.get('max_seats', 999999)
        if min_seats <= number_of_seats <= max_seats:
            return tier.get('months', settings.min_contract_months_for_payout)
    
    # Fallback auf höchste Staffel
    return settings.min_contract_months_for_payout


def calculate_exit_payout(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
    today: datetime,
    customer_first_contract_date: datetime = None
) -> float:
    """
    Berechnet was bei Ausscheiden heute ausbezahlt würde.
    Gibt immer 0 zurück wenn das Ergebnis negativ wäre.
    
    Berücksichtigt:
    - Arbeitsplätze-Staffel (exit_payout_tiers)
    - Exit-Zahlungen pro Vertragstyp (exit_payout_by_type)
    - Cloud und Software-Pflege können ausgeschlossen sein
    
    Args:
        customer_first_contract_date: Das Startdatum des ersten Vertrags des Kunden.
    """
    months_running = months_between(contract.start_date, today)
    
    # Vertrag bereits beendet
    if contract.status.value == 'completed' or (contract.end_date and contract.end_date < today):
        return 0.0
    
    # Ermittle die Exit-Payout-Monate basierend auf Arbeitsplätzen
    number_of_seats = getattr(contract, 'number_of_seats', 1) or 1
    min_months = get_exit_payout_months(settings, number_of_seats)
    
    # Mindestdauer erfüllt, kein Ausgleich
    if months_running >= min_months:
        return 0.0
    
    months_remaining = min_months - months_running
    
    # Negative Restmonate bedeuten, dass bereits überzahlt wurde -> 0
    if months_remaining <= 0:
        return 0.0
    
    # Exit-Provision berechnen mit Berücksichtigung der Typ-Konfiguration
    monthly_commission = _get_exit_monthly_commission(
        contract, settings, price_increases, commission_rates_list, today,
        customer_first_contract_date
    )
    
    result = monthly_commission * months_remaining
    
    # Niemals negative Auszahlungen
    return max(0.0, result)


def _get_exit_monthly_commission(
    contract: Contract,
    settings: Settings,
    price_increases: List[PriceIncrease],
    commission_rates_list: List[CommissionRate],
    date: datetime,
    customer_first_contract_date: datetime = None
) -> float:
    """
    Berechnet die monatliche Provision für Exit-Zahlung.
    Berücksichtigt exit_payout_by_type - nur Typen mit enabled=True werden einbezogen.
    """
    if contract.status.value != 'active':
        return 0.0
    
    # Get exit payout configuration per type
    exit_config = settings.exit_payout_by_type if settings.exit_payout_by_type else {
        "software_rental": {"enabled": True, "additional_months": 12},
        "software_care": {"enabled": False, "additional_months": 0},
        "apps": {"enabled": True, "additional_months": 12},
        "purchase": {"enabled": True, "additional_months": 12},
        "cloud": {"enabled": False, "additional_months": 0}
    }
    
    # Berechne die aktuellen Preise pro Betrag-Typ mit Erhöhungen
    # Nur Typen einbeziehen, die für Exit-Zahlungen aktiviert sind
    amounts = {}
    
    type_mapping = {
        'software_rental': contract.software_rental_amount,
        'software_care': contract.software_care_amount,
        'apps': contract.apps_amount,
        'purchase': contract.purchase_amount,
        'cloud': getattr(contract, 'cloud_amount', 0) or 0,
    }
    
    for amount_type, amount in type_mapping.items():
        type_config = exit_config.get(amount_type, {"enabled": False, "additional_months": 0})
        # Handle both dict and object formats
        if isinstance(type_config, dict):
            is_enabled = type_config.get('enabled', False)
        else:
            is_enabled = getattr(type_config, 'enabled', False)
        
        if is_enabled:
            amounts[amount_type] = amount
    
    # Mapping von camelCase zu snake_case
    camel_to_snake = {
        'softwareRental': 'software_rental',
        'softwareCare': 'software_care',
        'apps': 'apps',
        'purchase': 'purchase',
        'cloud': 'cloud',
    }
    
    months_since_rental_start = months_between(contract.start_date, date)
    
    # Noch in Gründerphase - keine Provision
    if months_since_rental_start < 0:
        return 0.0
    
    # Bestandsschutz für Preiserhöhungen prüfen - basierend auf erstem Kundenvertrag
    reference_date = customer_first_contract_date if customer_first_contract_date else contract.start_date
    
    # Get excluded price increase IDs for this contract
    excluded_ids = contract.excluded_price_increase_ids if hasattr(contract, 'excluded_price_increase_ids') else []
    
    # Get included early price increase IDs (manually activated)
    included_early_ids = contract.included_early_price_increase_ids if hasattr(contract, 'included_early_price_increase_ids') else []
    
    # Preiserhöhungen anwenden
    for price_increase in price_increases:
        # Skip if this price increase is excluded for this contract
        if price_increase.id in excluded_ids:
            continue
        
        # Check if this is a manually included early price increase
        is_manually_included = price_increase.id in included_early_ids
        
        # Preiserhöhung muss NACH dem Vertragsbeginn gültig werden
        # UNLESS it's manually included
        if price_increase.valid_from < contract.start_date and not is_manually_included:
            continue
            
        if price_increase.valid_from <= date:
            # Bestandsschutz: War der Kunde zum Zeitpunkt der Preiserhöhung (validFrom) bereits genug Monate Kunde?
            # Skip lock-in check for manually included price increases
            months_at_price_increase = months_between(reference_date, price_increase.valid_from)
            if months_at_price_increase >= price_increase.lock_in_months or is_manually_included:
                if price_increase.amount_increases:
                    for amount_type, increase_percent in price_increase.amount_increases.items():
                        # Normalisiere den Schlüssel (camelCase → snake_case)
                        normalized_key = camel_to_snake.get(amount_type, amount_type)
                        if normalized_key in amounts:
                            amounts[normalized_key] *= (1 + increase_percent / 100)
    
    # Berechne Provisionen pro Betrag-Typ mit aktuellen Sätzen
    total_commission = 0.0
    commission_rates = get_commission_rates_for_date(commission_rates_list, date)
    
    for amount_type, amount in amounts.items():
        # Get the commission rate for this amount type
        commission_rate = commission_rates.get(amount_type, 0)
        
        # Nach Vertragsende - prüfe postContractMonths
        if contract.end_date and date > contract.end_date:
            months_after_end = months_between(contract.end_date, date)
            post_contract_limit = settings.post_contract_months.get(amount_type, 0)
            if months_after_end > post_contract_limit:
                continue
        
        total_commission += amount * (commission_rate / 100)
    
    return total_commission
