#!/usr/bin/env python3
"""
Erstellt Verträge für bereits existierende Testkunden.
Verwendet Kunden mit Kundennummern die mit "99" beginnen.

Verwendung:
  python scripts/create_test_contracts.py
"""

import requests
import random
from datetime import datetime, timedelta
import os
import sys

# Konfiguration
API_URL = os.environ.get("API_URL", "http://localhost:8000")
NUM_CONTRACTS = 650
KUNDENNUMMER_PREFIX = "99"


def create_contract(session: requests.Session, customer_id: str) -> dict:
    """Erstellt einen Vertrag für einen Kunden"""
    
    # Zufälliges Startdatum in den letzten 3 Jahren
    days_ago = random.randint(30, 1095)
    start_date = datetime.now() - timedelta(days=days_ago)
    
    # Zufällige Beträge für verschiedene Vertragstypen
    contract_type = random.choice(["rental", "care", "mixed", "apps", "cloud"])
    
    software_rental = 0.0
    software_care = 0.0
    apps = 0.0
    purchase = 0.0
    cloud = 0.0
    
    if contract_type == "rental":
        software_rental = random.choice([49.0, 79.0, 99.0, 149.0, 199.0, 299.0])
    elif contract_type == "care":
        software_care = random.choice([29.0, 49.0, 79.0, 99.0, 149.0])
    elif contract_type == "mixed":
        software_rental = random.choice([49.0, 79.0, 99.0, 149.0])
        software_care = random.choice([19.0, 29.0, 49.0])
    elif contract_type == "apps":
        apps = random.choice([9.0, 19.0, 29.0, 49.0])
    elif contract_type == "cloud":
        cloud = random.choice([19.0, 39.0, 59.0, 99.0])
    
    # Manchmal Existenzgründer
    is_founder = random.random() < 0.1  # 10% Existenzgründer
    
    # Manchmal beendet
    end_date = None
    if random.random() < 0.15:  # 15% beendete Verträge
        end_date = start_date + timedelta(days=random.randint(180, 730))
    
    # Arbeitsplätze
    seats = random.choice([1, 1, 1, 2, 2, 3, 5, 10])
    
    contract_data = {
        "customerId": customer_id,
        "softwareRentalAmount": software_rental,
        "softwareCareAmount": software_care,
        "appsAmount": apps,
        "purchaseAmount": purchase,
        "cloudAmount": cloud,
        "currency": "EUR",
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat() if end_date else None,
        "isFounderDiscount": is_founder,
        "numberOfSeats": seats,
        "excludedPriceIncreaseIds": [],
        "includedEarlyPriceIncreaseIds": [],
        "notes": f"Testvertrag erstellt am {datetime.now().strftime('%Y-%m-%d')}"
    }
    
    response = session.post(f"{API_URL}/api/contracts", json=contract_data)
    if response.status_code == 200:
        data = response.json()
        return data.get("data") if "data" in data else data
    else:
        print(f"Fehler beim Erstellen von Vertrag: {response.text}")
        return None


def main():
    print(f"=== Testverträge erstellen ===")
    print(f"API-URL: {API_URL}")
    print()
    
    session = requests.Session()
    
    # Teste API-Verbindung
    try:
        response = session.get(f"{API_URL}/api/health")
        if response.status_code != 200:
            print(f"API nicht erreichbar: {API_URL}")
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print(f"Verbindung zu {API_URL} fehlgeschlagen!")
        sys.exit(1)
    
    print("API-Verbindung OK")
    print()
    
    # Hole alle Testkunden
    print("Lade Testkunden...")
    response = session.get(f"{API_URL}/api/customers")
    if response.status_code != 200:
        print(f"Fehler beim Laden der Kunden: {response.text}")
        sys.exit(1)
    
    data = response.json()
    # API gibt entweder {"data": ...} oder direkt die Liste zurück
    all_customers = data.get("data") if isinstance(data, dict) and "data" in data else data
    test_customers = [c for c in all_customers if c["kundennummer"].startswith(KUNDENNUMMER_PREFIX)]
    print(f"Gefunden: {len(test_customers)} Testkunden")
    
    if not test_customers:
        print("Keine Testkunden gefunden. Bitte erst create_test_data.py ausführen.")
        sys.exit(1)
    
    # Erstelle Verträge (verteilt auf Kunden)
    contracts_created = 0
    print(f"Erstelle {NUM_CONTRACTS} Verträge...")
    
    # Verteilungsstrategie
    contracts_per_customer = []
    remaining_contracts = NUM_CONTRACTS
    
    for i, customer in enumerate(test_customers):
        if remaining_contracts <= 0:
            contracts_per_customer.append(0)
            continue
        
        if i < len(test_customers) * 0.1:
            num = min(random.randint(3, 6), remaining_contracts)
        elif i < len(test_customers) * 0.3:
            num = min(random.randint(2, 4), remaining_contracts)
        else:
            num = min(random.randint(1, 3), remaining_contracts)
        
        contracts_per_customer.append(num)
        remaining_contracts -= num
    
    while remaining_contracts > 0:
        idx = random.randint(0, len(test_customers) - 1)
        contracts_per_customer[idx] += 1
        remaining_contracts -= 1
    
    # Erstelle die Verträge
    for i, customer in enumerate(test_customers):
        for _ in range(contracts_per_customer[i]):
            contract = create_contract(session, customer["id"])
            if contract:
                contracts_created += 1
        
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(test_customers)} Kunden verarbeitet, {contracts_created} Verträge erstellt")
    
    print(f"✓ {contracts_created} Verträge erstellt")
    print()
    print("=== Fertig! ===")


if __name__ == "__main__":
    main()
