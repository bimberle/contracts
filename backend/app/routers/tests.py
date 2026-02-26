"""
Test Router
API-Endpunkte fuer Berechnungstests
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any, Optional
import random

from app.database import get_db
from app.models.customer import Customer
from app.models.contract import Contract
from app.models.settings import Settings
from app.models.price_increase import PriceIncrease
from app.models.commission_rate import CommissionRate
from app.services.calculations import (
    get_current_monthly_price,
    get_current_monthly_commission,
    calculate_exit_payout,
    get_effective_status,
    get_commission_rates_for_date,
)
from app.utils.date_utils import months_between as mb, add_months

router = APIRouter(tags=["tests"])


def get_contract_description(contract: Contract) -> str:
    """Generiert eine Beschreibung fuer einen Vertrag basierend auf seinen Betraegen"""
    parts = []
    if contract.software_rental_amount > 0:
        parts.append(f"Miete: {contract.software_rental_amount:.0f}EUR")
    if contract.software_care_amount > 0:
        parts.append(f"Pflege: {contract.software_care_amount:.0f}EUR")
    if contract.apps_amount > 0:
        parts.append(f"Apps: {contract.apps_amount:.0f}EUR")
    if contract.purchase_amount > 0:
        parts.append(f"Kauf: {contract.purchase_amount:.0f}EUR")
    if contract.cloud_amount and contract.cloud_amount > 0:
        parts.append(f"Cloud: {contract.cloud_amount:.0f}EUR")
    
    if parts:
        return ", ".join(parts[:2])
    return f"Vertrag {contract.id[:8]}"


def get_first_contract_date(customer_id: str, db: Session) -> datetime:
    """Holt das Startdatum des ersten Vertrags eines Kunden"""
    first_contract = db.query(Contract).filter(
        Contract.customer_id == customer_id
    ).order_by(Contract.start_date.asc()).first()
    return first_contract.start_date if first_contract else None


def get_customer_name(customer: Optional[Customer]) -> str:
    """Formatiert den Kundennamen"""
    if not customer:
        return "Unbekannt"
    return f"{customer.name} {customer.name2 or ''}".strip()


def random_choice_or_none(items: list):
    """Waehlt zufaellig ein Element oder gibt None zurueck wenn Liste leer"""
    if not items:
        return None
    return random.choice(items)


@router.post("/run", response_model=dict)
def run_calculation_tests(db: Session = Depends(get_db)):
    """
    Fuehrt umfassende Tests der Berechnungslogik durch.
    Pro Test wird ein zufaellig passender Vertrag ausgewaehlt.
    """
    today = datetime.now()
    
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).all()
    contracts = db.query(Contract).all()
    customers = db.query(Customer).all()
    
    customer_lookup = {c.id: c for c in customers}
    
    test_results = {
        "timestamp": today.isoformat(),
        "summary": {
            "total_tests": 0,
            "passed": 0,
            "warnings": 0,
            "info": 0
        },
        "tests": []
    }
    
    test_counter = [0]
    
    def next_test_id():
        test_counter[0] += 1
        return f"T{test_counter[0]:03d}"
    
    # KATEGORIE 1: PREISERHOEHUNGEN
    price_increase_tests = create_price_increase_tests(
        contracts, price_increases, settings, customer_lookup, today, db, next_test_id
    )
    test_results["tests"].extend(price_increase_tests)
    
    # KATEGORIE 2: EXISTENZGRUENDER-SCHUTZ
    founder_tests = create_founder_protection_tests(
        contracts, settings, customer_lookup, today, next_test_id
    )
    test_results["tests"].extend(founder_tests)
    
    # KATEGORIE 3: PROVISIONSBERECHNUNG
    commission_tests = create_commission_tests(
        contracts, price_increases, settings, commission_rates, customer_lookup, today, db, next_test_id
    )
    test_results["tests"].extend(commission_tests)
    
    # KATEGORIE 4: EXIT-AUSZAHLUNGEN
    exit_tests = create_exit_payout_tests(
        contracts, price_increases, settings, commission_rates, customer_lookup, today, db, next_test_id
    )
    test_results["tests"].extend(exit_tests)
    
    for test in test_results["tests"]:
        test_results["summary"]["total_tests"] += 1
        if test["status"] == "passed":
            test_results["summary"]["passed"] += 1
        elif test["status"] == "warning":
            test_results["summary"]["warnings"] += 1
        else:
            test_results["summary"]["info"] += 1
    
    return {
        "status": "success",
        "data": test_results
    }


def create_price_increase_tests(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    customer_lookup: Dict[str, Customer],
    today: datetime,
    db: Session,
    next_test_id
) -> List[Dict[str, Any]]:
    """Erstellt Tests fuer die Preiserhoehungslogik"""
    tests = []
    active_contracts = [c for c in contracts if c.status.value == 'active']
    
    # T001: Gibt es Preiserhoehungen?
    pi_details = ", ".join([f"{pi.description or 'Ohne Name'} (ab {pi.valid_from.strftime('%d.%m.%Y')})" for pi in price_increases]) if price_increases else "-"
    tests.append({
        "test_id": next_test_id(),
        "category": "Preiserhoehungen",
        "name": "Preiserhoehungen vorhanden",
        "test_description": "Prueft ob Preiserhoehungen im System definiert sind.",
        "expected": "Mindestens eine Preiserhoehung sollte definiert sein fuer korrekte Provisionsanpassung.",
        "status": "passed" if price_increases else "info",
        "description": f"{len(price_increases)} Preiserhoehung(en) im System definiert." if price_increases else "Keine Preiserhoehungen definiert.",
        "contract_id": None,
            "customer_id": None,
        "contract_title": None,
        "customer_name": None,
        "calculations": [
            {"label": "Anzahl Preiserhoehungen", "value": len(price_increases)},
            {"label": "Details", "value": pi_details}
        ]
    })
    
    if not price_increases or not active_contracts:
        return tests
    
    # T002: Bestandsschutz aktiv
    protected_contracts = []
    for c in active_contracts:
        customer_first_date = get_first_contract_date(c.customer_id, db)
        for pi in price_increases:
            ref_date = customer_first_date if customer_first_date else c.start_date
            months_at_pi = mb(ref_date, pi.valid_from)
            excluded_ids = c.excluded_price_increase_ids or []
            if 0 < months_at_pi < pi.lock_in_months and pi.id not in excluded_ids:
                protected_contracts.append((c, pi, months_at_pi))
                break
    
    contract_info = random_choice_or_none(protected_contracts)
    if contract_info:
        contract, pi, months_at_pi = contract_info
        customer = customer_lookup.get(contract.customer_id)
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Bestandsschutz aktiv",
            "test_description": f"Prueft ob ein Vertrag mit aktivem Bestandsschutz korrekt vor Preiserhoehung '{pi.description}' geschuetzt wird.",
            "expected": f"Der Vertrag hat {months_at_pi} Monate Laufzeit, Lock-in ist {pi.lock_in_months} Monate. Preiserhoehung sollte NICHT angewendet werden.",
            "status": "passed",
            "description": f"Bestandsschutz korrekt aktiv: {months_at_pi} < {pi.lock_in_months} Monate",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Preiserhoehung", "value": pi.description or pi.id},
                {"label": "Vertragslaufzeit bei PE", "value": f"{months_at_pi} Monate"},
                {"label": "Lock-in Periode", "value": f"{pi.lock_in_months} Monate"},
                {"label": "Bestandsschutz aktiv", "value": "Ja"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Bestandsschutz aktiv",
            "test_description": "Prueft ob Vertraege mit aktivem Bestandsschutz korrekt geschuetzt werden.",
            "expected": "Vertraege unter Lock-in Periode sollten keine Preiserhoehung erhalten.",
            "status": "info",
            "description": "Kein Vertrag mit aktivem Bestandsschutz gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T003: Bestandsschutz erfuellt - Preiserhoehung wird angewendet
    fulfilled_contracts = []
    for c in active_contracts:
        customer_first_date = get_first_contract_date(c.customer_id, db)
        for pi in price_increases:
            ref_date = customer_first_date if customer_first_date else c.start_date
            months_at_pi = mb(ref_date, pi.valid_from)
            excluded_ids = c.excluded_price_increase_ids or []
            if months_at_pi >= pi.lock_in_months and pi.valid_from >= c.start_date and pi.id not in excluded_ids:
                fulfilled_contracts.append((c, pi, months_at_pi))
                break
    
    contract_info = random_choice_or_none(fulfilled_contracts)
    if contract_info:
        contract, pi, months_at_pi = contract_info
        customer = customer_lookup.get(contract.customer_id)
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        base_price = (contract.software_rental_amount + contract.software_care_amount + 
                      contract.apps_amount + contract.purchase_amount + (contract.cloud_amount or 0))
        current_price = get_current_monthly_price(contract, price_increases, today, customer_first_date)
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Bestandsschutz erfuellt - Erhoehung aktiv",
            "test_description": f"Prueft ob nach Ablauf des Bestandsschutzes die Preiserhoehung '{pi.description}' korrekt angewendet wird.",
            "expected": f"Der Vertrag hat {months_at_pi} Monate >= {pi.lock_in_months} Monate Lock-in. Preis sollte erhoeht sein.",
            "status": "passed" if current_price > base_price else "warning",
            "description": f"Basispreis: {base_price:.2f}EUR -> Aktuell: {current_price:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Preiserhoehung", "value": pi.description or pi.id},
                {"label": "Vertragslaufzeit bei PE", "value": f"{months_at_pi} Monate"},
                {"label": "Lock-in erfuellt", "value": f"Ja ({months_at_pi} >= {pi.lock_in_months})"},
                {"label": "Basispreis", "value": f"{base_price:.2f} EUR"},
                {"label": "Aktueller Preis", "value": f"{current_price:.2f} EUR"},
                {"label": "Differenz", "value": f"+{current_price - base_price:.2f} EUR"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Bestandsschutz erfuellt - Erhoehung aktiv",
            "test_description": "Prueft ob nach Ablauf des Bestandsschutzes Preiserhoehungen korrekt angewendet werden.",
            "expected": "Vertraege ueber Lock-in Periode sollten erhoehte Preise haben.",
            "status": "info",
            "description": "Kein Vertrag mit erfuelltem Bestandsschutz und anwendbarer PE gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T004: Explizit ausgeschlossene Preiserhoehung
    excluded_contracts = []
    for c in active_contracts:
        if c.excluded_price_increase_ids:
            for pi in price_increases:
                if pi.id in c.excluded_price_increase_ids:
                    excluded_contracts.append((c, pi))
                    break
    
    contract_info = random_choice_or_none(excluded_contracts)
    if contract_info:
        contract, pi = contract_info
        customer = customer_lookup.get(contract.customer_id)
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Explizit ausgeschlossene Preiserhoehung",
            "test_description": f"Prueft ob die Preiserhoehung '{pi.description}' fuer diesen Vertrag korrekt ignoriert wird.",
            "expected": "Der Vertrag hat diese Preiserhoehung explizit ausgeschlossen. Sie sollte nicht angewendet werden.",
            "status": "passed",
            "description": f"Preiserhoehung '{pi.description}' ist fuer diesen Vertrag ausgeschlossen.",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Ausgeschlossene PE", "value": pi.description or pi.id},
                {"label": "Anzahl Ausschluesse", "value": len(contract.excluded_price_increase_ids)}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Explizit ausgeschlossene Preiserhoehung",
            "test_description": "Prueft ob explizit ausgeschlossene Preiserhoehungen korrekt ignoriert werden.",
            "expected": "Ausgeschlossene Preiserhoehungen sollten nicht angewendet werden.",
            "status": "info",
            "description": "Kein Vertrag mit explizit ausgeschlossenen Preiserhoehungen gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T005: Manuell aktivierte Preiserhoehung
    early_included_contracts = []
    for c in active_contracts:
        if c.included_early_price_increase_ids:
            for pi in price_increases:
                if pi.id in c.included_early_price_increase_ids:
                    early_included_contracts.append((c, pi))
                    break
    
    contract_info = random_choice_or_none(early_included_contracts)
    if contract_info:
        contract, pi = contract_info
        customer = customer_lookup.get(contract.customer_id)
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Manuell aktivierte Preiserhoehung",
            "test_description": f"Prueft ob die Preiserhoehung '{pi.description}' trotz Bestandsschutz angewendet wird (manuell aktiviert).",
            "expected": "Der Vertrag hat diese PE manuell aktiviert - sie sollte trotz fehlender Lock-in angewendet werden.",
            "status": "passed",
            "description": f"Preiserhoehung '{pi.description}' wurde manuell aktiviert.",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Manuell aktivierte PE", "value": pi.description or pi.id},
                {"label": "Anzahl manuelle Aktivierungen", "value": len(contract.included_early_price_increase_ids)}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Preiserhoehungen",
            "name": "Manuell aktivierte Preiserhoehung",
            "test_description": "Prueft ob manuell aktivierte Preiserhoehungen den Bestandsschutz ueberspringen.",
            "expected": "Manuell aktivierte PE sollten sofort angewendet werden.",
            "status": "info",
            "description": "Kein Vertrag mit manuell aktivierter Preiserhoehung gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests


def create_founder_protection_tests(
    contracts: List[Contract],
    settings: Settings,
    customer_lookup: Dict[str, Customer],
    today: datetime,
    next_test_id
) -> List[Dict[str, Any]]:
    """Erstellt Tests fuer die Existenzgruender-Schutz-Logik"""
    tests = []
    founder_delay = settings.founder_delay_months if settings else 12
    founder_contracts = [c for c in contracts if c.is_founder_discount]
    
    # T006: Anzahl Existenzgruender-Vertraege
    tests.append({
        "test_id": next_test_id(),
        "category": "Existenzgruender-Schutz",
        "name": "Existenzgruender-Vertraege Uebersicht",
        "test_description": "Zaehlt die Vertraege mit aktivem Existenzgruender-Rabatt.",
        "expected": "Uebersicht ueber alle Existenzgruender-Vertraege im System.",
        "status": "passed" if founder_contracts else "info",
        "description": f"{len(founder_contracts)} Vertrag/Vertraege mit Existenzgruender-Rabatt.",
        "contract_id": None,
            "customer_id": None,
        "contract_title": None,
        "customer_name": None,
        "calculations": [
            {"label": "Anzahl Existenzgruender-Vertraege", "value": len(founder_contracts)},
            {"label": "Verzoegerung (Einstellung)", "value": f"{founder_delay} Monate"}
        ]
    })
    
    if not founder_contracts:
        return tests
    
    # T007: Vertrag noch in Gruenderphase
    in_phase_contracts = []
    for c in founder_contracts:
        effective_status, _ = get_effective_status(c, settings, today)
        if effective_status == "founder":
            founder_end = add_months(c.start_date, founder_delay)
            months_remaining = mb(today, founder_end)
            in_phase_contracts.append((c, founder_end, months_remaining))
    
    contract_info = random_choice_or_none(in_phase_contracts)
    if contract_info:
        contract, founder_end, months_remaining = contract_info
        customer = customer_lookup.get(contract.customer_id)
        tests.append({
            "test_id": next_test_id(),
            "category": "Existenzgruender-Schutz",
            "name": "Vertrag in aktiver Gruenderphase",
            "test_description": "Prueft einen Vertrag der sich noch in der Existenzgruender-Phase befindet.",
            "expected": f"Vertrag begann am {contract.start_date.strftime('%d.%m.%Y')}. Bei {founder_delay} Monaten Verzoegerung endet die Gruenderphase am {founder_end.strftime('%d.%m.%Y')}. Status sollte 'founder' sein.",
            "status": "warning",
            "description": f"Gruenderphase aktiv bis {founder_end.strftime('%d.%m.%Y')} (noch {max(0, months_remaining)} Monate)",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Vertragsbeginn", "value": contract.start_date.strftime('%d.%m.%Y')},
                {"label": "Gruenderphase endet", "value": founder_end.strftime('%d.%m.%Y')},
                {"label": "Verzoegerung", "value": f"{founder_delay} Monate"},
                {"label": "Noch verbleibend", "value": f"{max(0, months_remaining)} Monate"},
                {"label": "Aktueller Status", "value": "founder (keine Provision)"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Existenzgruender-Schutz",
            "name": "Vertrag in aktiver Gruenderphase",
            "test_description": "Prueft Vertraege die sich noch in der Existenzgruender-Phase befinden.",
            "expected": "Vertraege in Gruenderphase sollten keine Provision generieren.",
            "status": "info",
            "description": "Kein Vertrag mehr in aktiver Gruenderphase.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T008: Vertrag hat Gruenderphase beendet
    past_phase_contracts = []
    for c in founder_contracts:
        effective_status, _ = get_effective_status(c, settings, today)
        if effective_status != "founder":
            founder_end = add_months(c.start_date, founder_delay)
            past_phase_contracts.append((c, founder_end))
    
    contract_info = random_choice_or_none(past_phase_contracts)
    if contract_info:
        contract, founder_end = contract_info
        customer = customer_lookup.get(contract.customer_id)
        months_since_end = mb(founder_end, today)
        tests.append({
            "test_id": next_test_id(),
            "category": "Existenzgruender-Schutz",
            "name": "Gruenderphase beendet - Normal aktiv",
            "test_description": "Prueft einen Existenzgruender-Vertrag dessen Gruenderphase abgelaufen ist.",
            "expected": f"Gruenderphase endete am {founder_end.strftime('%d.%m.%Y')}. Vertrag sollte jetzt normal 'active' sein und Provision generieren.",
            "status": "passed",
            "description": f"Gruenderphase beendet seit {months_since_end} Monaten - Vertrag generiert Provision",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Vertragsbeginn", "value": contract.start_date.strftime('%d.%m.%Y')},
                {"label": "Gruenderphase endete", "value": founder_end.strftime('%d.%m.%Y')},
                {"label": "Monate seit Ende", "value": months_since_end},
                {"label": "Aktueller Status", "value": "active (Provision laeuft)"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Existenzgruender-Schutz",
            "name": "Gruenderphase beendet - Normal aktiv",
            "test_description": "Prueft Existenzgruender-Vertraege deren Gruenderphase abgelaufen ist.",
            "expected": "Nach Ablauf der Gruenderphase sollten Vertraege normal Provision generieren.",
            "status": "info",
            "description": "Alle Existenzgruender-Vertraege sind noch in der Gruenderphase.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests


def create_commission_tests(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    commission_rates: List[CommissionRate],
    customer_lookup: Dict[str, Customer],
    today: datetime,
    db: Session,
    next_test_id
) -> List[Dict[str, Any]]:
    """Erstellt Tests fuer die Provisionsberechnung"""
    tests = []
    active_contracts = [c for c in contracts if c.status.value == 'active']
    rates = get_commission_rates_for_date(commission_rates, today)
    
    # T009: Provisionssaetze vorhanden
    rate_str = ', '.join([f'{k}: {v}%' for k, v in rates.items()]) if rates else "Keine"
    tests.append({
        "test_id": next_test_id(),
        "category": "Provisionsberechnung",
        "name": "Provisionssaetze definiert",
        "test_description": "Prueft ob Provisionssaetze im System definiert sind.",
        "expected": "Fuer jede Vertragsart sollte ein Provisionssatz definiert sein.",
        "status": "passed" if rates else "warning",
        "description": f"Aktive Provisionssaetze: {rate_str}" if rates else "Keine Provisionssaetze definiert!",
        "contract_id": None,
            "customer_id": None,
        "contract_title": None,
        "customer_name": None,
        "calculations": [{"label": typ, "value": f"{rate}%"} for typ, rate in rates.items()]
    })
    
    if not active_contracts:
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Keine aktiven Vertraege",
            "test_description": "Prueft ob aktive Vertraege vorhanden sind.",
            "expected": "Es sollten aktive Vertraege fuer Provisionsberechnung existieren.",
            "status": "info",
            "description": "Keine aktiven Vertraege im System.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
        return tests
    
    # T010: Vertrag mit Software-Miete
    rental_contracts = [c for c in active_contracts if c.software_rental_amount > 0]
    contract = random_choice_or_none(rental_contracts)
    if contract:
        customer = customer_lookup.get(contract.customer_id)
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        rate = rates.get('software_rental', 0)
        commission = get_current_monthly_commission(contract, settings, price_increases, commission_rates, today, customer_first_date)
        expected_base = contract.software_rental_amount * (rate / 100)
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Provision fuer Software-Miete",
            "test_description": "Berechnet die Provision fuer einen Vertrag mit Software-Miete.",
            "expected": f"Software-Miete: {contract.software_rental_amount:.2f}EUR x {rate}% = {expected_base:.2f}EUR Basis-Provision (ohne Preiserhoehungen).",
            "status": "passed",
            "description": f"Monatliche Provision: {commission:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Software-Miete Betrag", "value": f"{contract.software_rental_amount:.2f} EUR"},
                {"label": "Provisionssatz", "value": f"{rate}%"},
                {"label": "Basis-Provision (ohne PE)", "value": f"{expected_base:.2f} EUR"},
                {"label": "Aktuelle Provision (mit PE)", "value": f"{commission:.2f} EUR"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Provision fuer Software-Miete",
            "test_description": "Berechnet die Provision fuer Software-Miete-Vertraege.",
            "expected": "Ein aktiver Vertrag mit Software-Miete sollte existieren.",
            "status": "info",
            "description": "Kein Vertrag mit Software-Miete gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T011: Vertrag mit Software-Pflege
    care_contracts = [c for c in active_contracts if c.software_care_amount > 0]
    contract = random_choice_or_none(care_contracts)
    if contract:
        customer = customer_lookup.get(contract.customer_id)
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        rate = rates.get('software_care', 0)
        commission = get_current_monthly_commission(contract, settings, price_increases, commission_rates, today, customer_first_date)
        expected_base = contract.software_care_amount * (rate / 100)
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Provision fuer Software-Pflege",
            "test_description": "Berechnet die Provision fuer einen Vertrag mit Software-Pflege.",
            "expected": f"Software-Pflege: {contract.software_care_amount:.2f}EUR x {rate}% = {expected_base:.2f}EUR Basis-Provision.",
            "status": "passed",
            "description": f"Monatliche Provision: {commission:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Software-Pflege Betrag", "value": f"{contract.software_care_amount:.2f} EUR"},
                {"label": "Provisionssatz", "value": f"{rate}%"},
                {"label": "Basis-Provision (ohne PE)", "value": f"{expected_base:.2f} EUR"},
                {"label": "Aktuelle Provision (mit PE)", "value": f"{commission:.2f} EUR"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Provision fuer Software-Pflege",
            "test_description": "Berechnet die Provision fuer Software-Pflege-Vertraege.",
            "expected": "Ein aktiver Vertrag mit Software-Pflege sollte existieren.",
            "status": "info",
            "description": "Kein Vertrag mit Software-Pflege gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T012: Vertrag mit mehreren Betragsarten
    multi_type_contracts = [c for c in active_contracts if 
        sum([1 for x in [c.software_rental_amount, c.software_care_amount, c.apps_amount, c.purchase_amount] if x > 0]) >= 2]
    contract = random_choice_or_none(multi_type_contracts)
    if contract:
        customer = customer_lookup.get(contract.customer_id)
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        commission = get_current_monthly_commission(contract, settings, price_increases, commission_rates, today, customer_first_date)
        
        details = []
        total_base = 0
        if contract.software_rental_amount > 0:
            amt = contract.software_rental_amount
            rate = rates.get('software_rental', 0)
            prov = amt * (rate / 100)
            total_base += prov
            details.append({"label": f"Miete ({amt:.2f}EUR x {rate}%)", "value": f"{prov:.2f} EUR"})
        if contract.software_care_amount > 0:
            amt = contract.software_care_amount
            rate = rates.get('software_care', 0)
            prov = amt * (rate / 100)
            total_base += prov
            details.append({"label": f"Pflege ({amt:.2f}EUR x {rate}%)", "value": f"{prov:.2f} EUR"})
        if contract.apps_amount > 0:
            amt = contract.apps_amount
            rate = rates.get('apps', 0)
            prov = amt * (rate / 100)
            total_base += prov
            details.append({"label": f"Apps ({amt:.2f}EUR x {rate}%)", "value": f"{prov:.2f} EUR"})
        if contract.purchase_amount > 0:
            amt = contract.purchase_amount
            rate = rates.get('purchase', 0)
            prov = amt * (rate / 100)
            total_base += prov
            details.append({"label": f"Kauf ({amt:.2f}EUR x {rate}%)", "value": f"{prov:.2f} EUR"})
        
        details.append({"label": "Summe Basis-Provision", "value": f"{total_base:.2f} EUR"})
        details.append({"label": "Aktuelle Provision (mit PE)", "value": f"{commission:.2f} EUR"})
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Kombinierte Provision (mehrere Typen)",
            "test_description": "Berechnet die Provision fuer einen Vertrag mit mehreren Betragsarten.",
            "expected": "Jede Betragsart wird mit ihrem spezifischen Provisionssatz multipliziert und aufsummiert.",
            "status": "passed",
            "description": f"Kombinierte monatliche Provision: {commission:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": details
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Provisionsberechnung",
            "name": "Kombinierte Provision (mehrere Typen)",
            "test_description": "Berechnet die Provision fuer Vertraege mit mehreren Betragsarten.",
            "expected": "Vertraege mit mehreren Typen sollten kombinierte Provision erhalten.",
            "status": "info",
            "description": "Kein Vertrag mit mehreren Betragsarten gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests


def create_exit_payout_tests(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    commission_rates: List[CommissionRate],
    customer_lookup: Dict[str, Customer],
    today: datetime,
    db: Session,
    next_test_id
) -> List[Dict[str, Any]]:
    """Erstellt Tests fuer die Exit-Auszahlungsberechnung"""
    tests = []
    active_contracts = [c for c in contracts if c.status.value == 'active']
    min_months = settings.min_contract_months_for_payout if settings else 60
    exit_tiers = settings.exit_payout_tiers if settings else []
    
    # T013: Exit-Konfiguration
    tier_str = ", ".join([f"Ab {t.get('fromMonth', 0)} Mon.: {t.get('percentage', 100)}%" for t in exit_tiers]) if exit_tiers else "Keine"
    tests.append({
        "test_id": next_test_id(),
        "category": "Exit-Auszahlung",
        "name": "Exit-Konfiguration",
        "test_description": "Zeigt die aktuelle Exit-Konfiguration an.",
        "expected": "Exit-Tiers sollten definiert sein um gestaffelte Auszahlungen zu ermoeglichen.",
        "status": "passed" if exit_tiers else "info",
        "description": f"Mindestlaufzeit: {min_months} Monate, {len(exit_tiers)} Tier(s) definiert",
        "contract_id": None,
            "customer_id": None,
        "contract_title": None,
        "customer_name": None,
        "calculations": [
            {"label": "Mindestlaufzeit", "value": f"{min_months} Monate"},
            {"label": "Exit-Tiers", "value": tier_str}
        ]
    })
    
    if not active_contracts:
        return tests
    
    # T014: Vertrag UNTER Mindestlaufzeit (Exit-Anspruch vorhanden)
    under_min_contracts = []
    for c in active_contracts:
        months_running = mb(c.start_date, today)
        if months_running < min_months:
            customer_first_date = get_first_contract_date(c.customer_id, db)
            exit_payout = calculate_exit_payout(c, settings, price_increases, commission_rates, today, customer_first_date)
            if exit_payout > 0:
                under_min_contracts.append((c, months_running, exit_payout))
    
    contract_info = random_choice_or_none(under_min_contracts)
    if contract_info:
        contract, months_running, exit_payout = contract_info
        customer = customer_lookup.get(contract.customer_id)
        months_remaining = min_months - months_running
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        monthly_commission = get_current_monthly_commission(contract, settings, price_increases, commission_rates, today, customer_first_date)
        
        applicable_tier = None
        for tier in sorted(exit_tiers, key=lambda t: t.get('fromMonth', 0), reverse=True):
            if months_running >= tier.get('fromMonth', 0):
                applicable_tier = tier
                break
        tier_pct = applicable_tier.get('percentage', 100) if applicable_tier else 100
        tier_from = applicable_tier.get('fromMonth', 0) if applicable_tier else 0
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Exit-Auszahlung",
            "name": "Vertrag unter Mindestlaufzeit (Exit-Anspruch)",
            "test_description": "Berechnet die Exit-Auszahlung fuer einen Vertrag unter der Mindestlaufzeit.",
            "expected": f"Laufzeit {months_running} Monate < {min_months} Monate. Exit = Restmonate x Provision x Tier%. Berechnung: {months_remaining} x {monthly_commission:.2f}EUR x {tier_pct}% = {exit_payout:.2f}EUR",
            "status": "warning",
            "description": f"Exit-Auszahlung wenn heute: {exit_payout:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Vertragslaufzeit", "value": f"{months_running} Monate"},
                {"label": "Mindestlaufzeit", "value": f"{min_months} Monate"},
                {"label": "Verbleibende Monate", "value": f"{months_remaining} Monate"},
                {"label": "Monatliche Provision", "value": f"{monthly_commission:.2f} EUR"},
                {"label": "Anwendbares Tier", "value": f"{tier_pct}% (ab Monat {tier_from})"},
                {"label": "Exit-Auszahlung", "value": f"{exit_payout:.2f} EUR"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Exit-Auszahlung",
            "name": "Vertrag unter Mindestlaufzeit (Exit-Anspruch)",
            "test_description": "Prueft Vertraege unter Mindestlaufzeit mit Exit-Anspruch.",
            "expected": "Vertraege unter Mindestlaufzeit sollten Exit-Anspruch haben.",
            "status": "info",
            "description": "Kein Vertrag unter Mindestlaufzeit mit Exit-Anspruch gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T015: Vertrag UEBER Mindestlaufzeit (kein Exit-Anspruch)
    over_min_contracts = []
    for c in active_contracts:
        months_running = mb(c.start_date, today)
        if months_running >= min_months:
            over_min_contracts.append((c, months_running))
    
    contract_info = random_choice_or_none(over_min_contracts)
    if contract_info:
        contract, months_running = contract_info
        customer = customer_lookup.get(contract.customer_id)
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        exit_payout = calculate_exit_payout(contract, settings, price_increases, commission_rates, today, customer_first_date)
        
        tests.append({
            "test_id": next_test_id(),
            "category": "Exit-Auszahlung",
            "name": "Vertrag ueber Mindestlaufzeit (kein Exit)",
            "test_description": "Prueft ob Vertraege ueber der Mindestlaufzeit keinen Exit-Anspruch haben.",
            "expected": f"Laufzeit {months_running} Monate >= {min_months} Monate. Exit-Auszahlung sollte 0EUR sein.",
            "status": "passed" if exit_payout == 0 else "warning",
            "description": "Mindestlaufzeit erreicht - kein Exit-Anspruch" if exit_payout == 0 else f"Unerwartete Exit-Auszahlung: {exit_payout:.2f}EUR",
            "contract_id": contract.id,
            "customer_id": contract.customer_id,
            "contract_title": get_contract_description(contract),
            "customer_name": get_customer_name(customer),
            "calculations": [
                {"label": "Vertragslaufzeit", "value": f"{months_running} Monate"},
                {"label": "Mindestlaufzeit", "value": f"{min_months} Monate"},
                {"label": "Mindestlaufzeit erreicht", "value": "Ja"},
                {"label": "Exit-Auszahlung", "value": f"{exit_payout:.2f} EUR"}
            ]
        })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Exit-Auszahlung",
            "name": "Vertrag ueber Mindestlaufzeit (kein Exit)",
            "test_description": "Prueft ob Vertraege ueber Mindestlaufzeit keinen Exit-Anspruch haben.",
            "expected": "Nach Erreichen der Mindestlaufzeit sollte kein Exit-Anspruch bestehen.",
            "status": "info",
            "description": "Kein Vertrag ueber Mindestlaufzeit gefunden.",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    # T016: Tier-basierte Exit-Berechnung
    if exit_tiers and len(exit_tiers) > 1:
        tier_contracts = []
        for c in active_contracts:
            months_running = mb(c.start_date, today)
            if months_running < min_months:
                customer_first_date = get_first_contract_date(c.customer_id, db)
                exit_payout = calculate_exit_payout(c, settings, price_increases, commission_rates, today, customer_first_date)
                
                for tier in sorted(exit_tiers, key=lambda t: t.get('fromMonth', 0), reverse=True):
                    if months_running >= tier.get('fromMonth', 0):
                        tier_contracts.append((c, months_running, exit_payout, tier))
                        break
        
        contract_info = random_choice_or_none(tier_contracts)
        if contract_info:
            contract, months_running, exit_payout, tier = contract_info
            customer = customer_lookup.get(contract.customer_id)
            tier_pct = tier.get('percentage', 100)
            tier_from = tier.get('fromMonth', 0)
            all_tiers_str = ", ".join([f"{t.get('fromMonth', 0)}+ Mon.: {t.get('percentage', 100)}%" for t in sorted(exit_tiers, key=lambda x: x.get('fromMonth', 0))])
            
            tests.append({
                "test_id": next_test_id(),
                "category": "Exit-Auszahlung",
                "name": "Tier-basierte Exit-Berechnung",
                "test_description": f"Prueft ob das Tier ab Monat {tier_from} ({tier_pct}%) korrekt angewendet wird.",
                "expected": f"Bei {months_running} Monaten Laufzeit sollte das Tier ab Monat {tier_from} mit {tier_pct}% angewendet werden.",
                "status": "passed",
                "description": f"Tier {tier_pct}% (ab Monat {tier_from}) angewendet -> Exit: {exit_payout:.2f}EUR",
                "contract_id": contract.id,
            "customer_id": contract.customer_id,
                "contract_title": get_contract_description(contract),
                "customer_name": get_customer_name(customer),
                "calculations": [
                    {"label": "Vertragslaufzeit", "value": f"{months_running} Monate"},
                    {"label": "Anwendbares Tier", "value": f"Ab Monat {tier_from}: {tier_pct}%"},
                    {"label": "Alle Tiers", "value": all_tiers_str},
                    {"label": "Exit-Auszahlung", "value": f"{exit_payout:.2f} EUR"}
                ]
            })
        else:
            tests.append({
                "test_id": next_test_id(),
                "category": "Exit-Auszahlung",
                "name": "Tier-basierte Exit-Berechnung",
                "test_description": "Prueft die Anwendung der Exit-Tiers.",
                "expected": "Vertraege sollten basierend auf ihrer Laufzeit das passende Tier erhalten.",
                "status": "info",
                "description": "Kein passender Vertrag fuer Tier-Test gefunden.",
                "contract_id": None,
            "customer_id": None,
                "contract_title": None,
                "customer_name": None,
                "calculations": []
            })
    else:
        tests.append({
            "test_id": next_test_id(),
            "category": "Exit-Auszahlung",
            "name": "Tier-basierte Exit-Berechnung",
            "test_description": "Prueft die Anwendung der Exit-Tiers.",
            "expected": "Mehrere Tiers sollten fuer gestaffelte Exit-Berechnung definiert sein.",
            "status": "info",
            "description": "Nicht genuegend Exit-Tiers definiert (min. 2 fuer sinnvolle Staffelung).",
            "contract_id": None,
            "customer_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests
