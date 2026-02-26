"""
Test Router
API-Endpunkte für Berechnungstests
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Dict, Any

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
from app.utils.date_utils import months_between as mb

router = APIRouter(tags=["tests"])


def get_contract_description(contract: Contract) -> str:
    """Generiert eine Beschreibung für einen Vertrag basierend auf seinen Beträgen"""
    parts = []
    if contract.software_rental_amount > 0:
        parts.append(f"Miete: {contract.software_rental_amount:.0f}€")
    if contract.software_care_amount > 0:
        parts.append(f"Pflege: {contract.software_care_amount:.0f}€")
    if contract.apps_amount > 0:
        parts.append(f"Apps: {contract.apps_amount:.0f}€")
    if contract.purchase_amount > 0:
        parts.append(f"Kauf: {contract.purchase_amount:.0f}€")
    if contract.cloud_amount and contract.cloud_amount > 0:
        parts.append(f"Cloud: {contract.cloud_amount:.0f}€")
    
    if parts:
        return ", ".join(parts[:2])  # Max 2 Teile für Übersicht
    return f"Vertrag {contract.id[:8]}"


def get_first_contract_date(customer_id: str, db: Session) -> datetime:
    """Holt das Startdatum des ersten Vertrags eines Kunden"""
    first_contract = db.query(Contract).filter(
        Contract.customer_id == customer_id
    ).order_by(Contract.start_date.asc()).first()
    return first_contract.start_date if first_contract else None


@router.post("/run", response_model=dict)
def run_calculation_tests(db: Session = Depends(get_db)):
    """
    Führt umfassende Tests der Berechnungslogik durch
    """
    today = datetime.now()
    
    # Lade alle benötigten Daten
    settings = db.query(Settings).filter(Settings.id == "default").first()
    price_increases = db.query(PriceIncrease).all()
    commission_rates = db.query(CommissionRate).all()
    contracts = db.query(Contract).all()
    customers = db.query(Customer).all()
    
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
    
    # Test 1: Preiserhöhungen
    price_increase_tests = test_price_increases(
        contracts, price_increases, settings, commission_rates, today, db
    )
    test_results["tests"].extend(price_increase_tests)
    
    # Test 2: Existenzgründer-Schutz
    founder_tests = test_founder_protection(
        contracts, settings, today
    )
    test_results["tests"].extend(founder_tests)
    
    # Test 3: Provisionsberechnung
    commission_tests = test_commission_calculation(
        contracts, price_increases, settings, commission_rates, today, db
    )
    test_results["tests"].extend(commission_tests)
    
    # Test 4: Exit-Auszahlungen
    exit_tests = test_exit_payouts(
        contracts, price_increases, settings, commission_rates, today, db
    )
    test_results["tests"].extend(exit_tests)
    
    # Zusammenfassung berechnen
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


def test_price_increases(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    commission_rates: List[CommissionRate],
    today: datetime,
    db: Session
) -> List[Dict[str, Any]]:
    """Testet die Preiserhöhungslogik"""
    tests = []
    
    if not price_increases:
        tests.append({
            "category": "Preiserhöhungen",
            "name": "Keine Preiserhöhungen definiert",
            "status": "info",
            "description": "Es sind keine Preiserhöhungen im System hinterlegt.",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
        return tests
    
    for pi in price_increases:
        # Finde Verträge, die von dieser Preiserhöhung betroffen sein könnten
        affected_contracts = []
        not_affected_contracts = []
        
        for contract in contracts:
            if contract.status.value != 'active':
                continue
                
            customer = db.query(Customer).filter(Customer.id == contract.customer_id).first()
            customer_first_date = get_first_contract_date(contract.customer_id, db)
            
            # Prüfe Bestandsschutz
            reference_date = customer_first_date if customer_first_date else contract.start_date
            months_at_pi = mb(reference_date, pi.valid_from)
            
            # Ist der Vertrag explizit ausgeschlossen?
            excluded_ids = contract.excluded_price_increase_ids or []
            included_early_ids = contract.included_early_price_increase_ids or []
            
            is_excluded = pi.id in excluded_ids
            is_manually_included = pi.id in included_early_ids
            
            # Berechne Basispreis und erhöhten Preis
            base_price = (
                contract.software_rental_amount +
                contract.software_care_amount +
                contract.apps_amount +
                contract.purchase_amount +
                (contract.cloud_amount or 0)
            )
            
            current_price = get_current_monthly_price(
                contract, price_increases, today, customer_first_date
            )
            
            contract_info = {
                "contract_id": contract.id,
                "contract_title": get_contract_description(contract),
                "customer_name": f"{customer.name} {customer.name2 or ''}".strip() if customer else "Unbekannt",
                "start_date": contract.start_date.isoformat(),
                "base_price": round(base_price, 2),
                "current_price": round(current_price, 2),
                "months_at_price_increase": months_at_pi,
                "lock_in_months": pi.lock_in_months,
                "is_excluded": is_excluded,
                "is_manually_included": is_manually_included
            }
            
            # Logik: Wird die Preiserhöhung angewendet?
            applies = False
            reason = ""
            
            if is_excluded:
                reason = "Explizit ausgeschlossen"
            elif is_manually_included:
                applies = True
                reason = "Manuell aktiviert (Bestandsschutz übersprungen)"
            elif pi.valid_from < contract.start_date:
                reason = f"Preiserhöhung ({pi.valid_from.strftime('%d.%m.%Y')}) liegt vor Vertragsbeginn ({contract.start_date.strftime('%d.%m.%Y')})"
            elif months_at_pi < pi.lock_in_months:
                reason = f"Bestandsschutz aktiv: {months_at_pi} Monate < {pi.lock_in_months} Monate Lock-in"
            else:
                applies = True
                reason = f"Bestandsschutz erfüllt: {months_at_pi} Monate >= {pi.lock_in_months} Monate Lock-in"
            
            contract_info["applies"] = applies
            contract_info["reason"] = reason
            
            if applies:
                affected_contracts.append(contract_info)
            else:
                not_affected_contracts.append(contract_info)
        
        # Erstelle Test-Eintrag
        tests.append({
            "category": "Preiserhöhungen",
            "name": f"Preiserhöhung: {pi.description or pi.id}",
            "status": "passed" if affected_contracts else "info",
            "description": f"Gültig ab {pi.valid_from.strftime('%d.%m.%Y')}, Lock-in: {pi.lock_in_months} Monate",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": [
                {
                    "label": "Betroffene Verträge",
                    "value": len(affected_contracts),
                    "details": affected_contracts
                },
                {
                    "label": "Nicht betroffene Verträge (Bestandsschutz/Ausschluss)",
                    "value": len(not_affected_contracts),
                    "details": not_affected_contracts
                }
            ]
        })
    
    return tests


def test_founder_protection(
    contracts: List[Contract],
    settings: Settings,
    today: datetime
) -> List[Dict[str, Any]]:
    """Testet die Existenzgründer-Schutz-Logik"""
    tests = []
    founder_delay = settings.founder_delay_months if settings else 12
    
    founder_contracts = [c for c in contracts if c.is_founder_discount]
    
    if not founder_contracts:
        tests.append({
            "category": "Existenzgründer-Schutz",
            "name": "Keine Existenzgründer-Verträge",
            "status": "info",
            "description": "Es gibt keine Verträge mit Existenzgründer-Rabatt.",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
        return tests
    
    for contract in founder_contracts:
        effective_status, active_from = get_effective_status(contract, settings, today)
        
        from app.utils.date_utils import add_months
        founder_end = add_months(contract.start_date, founder_delay)
        months_remaining = mb(today, founder_end)
        
        status = "passed"
        if effective_status == "founder":
            status = "warning"  # Noch in Gründerphase
        
        tests.append({
            "category": "Existenzgründer-Schutz",
            "name": f"Vertrag: {get_contract_description(contract)}",
            "status": status,
            "description": f"Existenzgründer-Rabatt aktiv",
            "contract_id": contract.id,
            "contract_title": get_contract_description(contract),
            "customer_name": None,  # Wird im Frontend über contract geholt
            "calculations": [
                {
                    "label": "Vertragsbeginn",
                    "value": contract.start_date.strftime('%d.%m.%Y')
                },
                {
                    "label": "Gründerphase endet",
                    "value": founder_end.strftime('%d.%m.%Y')
                },
                {
                    "label": "Verzögerung (Monate)",
                    "value": founder_delay
                },
                {
                    "label": "Aktueller Status",
                    "value": effective_status
                },
                {
                    "label": "Verbleibende Gründer-Monate",
                    "value": max(0, months_remaining) if effective_status == "founder" else 0
                }
            ]
        })
    
    return tests


def test_commission_calculation(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    commission_rates: List[CommissionRate],
    today: datetime,
    db: Session
) -> List[Dict[str, Any]]:
    """Testet die Provisionsberechnung"""
    tests = []
    
    active_contracts = [c for c in contracts if c.status.value == 'active']
    
    if not active_contracts:
        tests.append({
            "category": "Provisionsberechnung",
            "name": "Keine aktiven Verträge",
            "status": "info",
            "description": "Es gibt keine aktiven Verträge für die Provisionsberechnung.",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
        return tests
    
    # Aktuelle Provisionsätze
    rates = get_commission_rates_for_date(commission_rates, today)
    
    # Teste eine Auswahl von Verträgen (max 10 für Performance)
    sample_contracts = active_contracts[:10]
    
    for contract in sample_contracts:
        customer = db.query(Customer).filter(Customer.id == contract.customer_id).first()
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        
        # Berechne Einzelwerte
        base_amounts = {
            "software_rental": contract.software_rental_amount,
            "software_care": contract.software_care_amount,
            "apps": contract.apps_amount,
            "purchase": contract.purchase_amount,
            "cloud": contract.cloud_amount or 0
        }
        
        current_price = get_current_monthly_price(
            contract, price_increases, today, customer_first_date
        )
        
        monthly_commission = get_current_monthly_commission(
            contract, settings, price_increases, commission_rates, today, customer_first_date
        )
        
        # Detaillierte Berechnung
        calculations = [
            {
                "label": "Basis-Beträge",
                "value": f"{sum(base_amounts.values()):.2f} €",
                "details": {k: f"{v:.2f} €" for k, v in base_amounts.items()}
            },
            {
                "label": "Aktueller Monatspreis (mit Erhöhungen)",
                "value": f"{current_price:.2f} €"
            },
            {
                "label": "Monatliche Provision",
                "value": f"{monthly_commission:.2f} €"
            },
            {
                "label": "Angewandte Provisionsätze",
                "value": ", ".join([f"{k}: {v}%" for k, v in rates.items()])
            }
        ]
        
        # Detailberechnung pro Typ
        commission_details = []
        for amount_type, amount in base_amounts.items():
            rate = rates.get(amount_type, 0)
            commission = amount * (rate / 100)
            if amount > 0:
                commission_details.append({
                    "type": amount_type,
                    "amount": f"{amount:.2f} €",
                    "rate": f"{rate}%",
                    "commission": f"{commission:.2f} €"
                })
        
        calculations.append({
            "label": "Provisionsberechnung pro Typ",
            "value": f"{len(commission_details)} Typen",
            "details": commission_details
        })
        
        tests.append({
            "category": "Provisionsberechnung",
            "name": f"Vertrag: {get_contract_description(contract)}",
            "status": "passed",
            "description": f"Provision: {monthly_commission:.2f} € / Monat",
            "contract_id": contract.id,
            "contract_title": get_contract_description(contract),
            "customer_name": f"{customer.name} {customer.name2 or ''}".strip() if customer else "Unbekannt",
            "calculations": calculations
        })
    
    if len(active_contracts) > 10:
        tests.append({
            "category": "Provisionsberechnung",
            "name": f"Weitere Verträge",
            "status": "info",
            "description": f"{len(active_contracts) - 10} weitere aktive Verträge nicht einzeln getestet (Performance)",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests


def test_exit_payouts(
    contracts: List[Contract],
    price_increases: List[PriceIncrease],
    settings: Settings,
    commission_rates: List[CommissionRate],
    today: datetime,
    db: Session
) -> List[Dict[str, Any]]:
    """Testet die Exit-Auszahlungsberechnung"""
    tests = []
    
    active_contracts = [c for c in contracts if c.status.value == 'active']
    
    if not active_contracts:
        tests.append({
            "category": "Exit-Auszahlung",
            "name": "Keine aktiven Verträge",
            "status": "info",
            "description": "Es gibt keine aktiven Verträge für die Exit-Berechnung.",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
        return tests
    
    min_months = settings.min_contract_months_for_payout if settings else 60
    exit_tiers = settings.exit_payout_tiers if settings else []
    exit_by_type = settings.exit_payout_by_type if settings else {}
    
    # Teste eine Auswahl von Verträgen (max 10)
    sample_contracts = active_contracts[:10]
    
    for contract in sample_contracts:
        customer = db.query(Customer).filter(Customer.id == contract.customer_id).first()
        customer_first_date = get_first_contract_date(contract.customer_id, db)
        
        months_running = mb(contract.start_date, today)
        
        exit_payout = calculate_exit_payout(
            contract, settings, price_increases, commission_rates, today, customer_first_date
        )
        
        # Finde anwendbares Tier
        applicable_tier = None
        for tier in sorted(exit_tiers, key=lambda t: t.get('fromMonth', 0), reverse=True):
            if months_running >= tier.get('fromMonth', 0):
                applicable_tier = tier
                break
        
        months_remaining = max(0, min_months - months_running)
        
        calculations = [
            {
                "label": "Vertragslaufzeit",
                "value": f"{months_running} Monate"
            },
            {
                "label": "Mindestlaufzeit für Exit",
                "value": f"{min_months} Monate"
            },
            {
                "label": "Verbleibende Monate",
                "value": f"{months_remaining} Monate"
            },
            {
                "label": "Anwendbares Exit-Tier",
                "value": f"{applicable_tier.get('percentage', 100)}% (ab Monat {applicable_tier.get('fromMonth', 0)})" if applicable_tier else "Kein Tier"
            },
            {
                "label": "Exit-Auszahlung wenn heute",
                "value": f"{exit_payout:.2f} €"
            }
        ]
        
        # Welche Typen sind für Exit aktiviert?
        enabled_types = []
        for type_name, config in exit_by_type.items():
            if isinstance(config, dict) and config.get('enabled', False):
                enabled_types.append(f"{type_name} (+{config.get('additional_months', 0)} Monate)")
        
        calculations.append({
            "label": "Für Exit aktivierte Typen",
            "value": ", ".join(enabled_types) if enabled_types else "Keine"
        })
        
        status = "passed"
        if exit_payout > 0 and months_remaining > 0:
            status = "warning"  # Hat noch Anspruch auf Exit
        
        tests.append({
            "category": "Exit-Auszahlung",
            "name": f"Vertrag: {get_contract_description(contract)}",
            "status": status,
            "description": f"Exit: {exit_payout:.2f} € (Laufzeit: {months_running} Mon.)",
            "contract_id": contract.id,
            "contract_title": get_contract_description(contract),
            "customer_name": f"{customer.name} {customer.name2 or ''}".strip() if customer else "Unbekannt",
            "calculations": calculations
        })
    
    if len(active_contracts) > 10:
        tests.append({
            "category": "Exit-Auszahlung",
            "name": f"Weitere Verträge",
            "status": "info",
            "description": f"{len(active_contracts) - 10} weitere aktive Verträge nicht einzeln getestet (Performance)",
            "contract_id": None,
            "contract_title": None,
            "customer_name": None,
            "calculations": []
        })
    
    return tests
