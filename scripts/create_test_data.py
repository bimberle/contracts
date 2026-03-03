#!/usr/bin/env python3
"""
Erstellt Testdaten: 250 Kunden mit insgesamt 650 Verträgen.
Alle Testkunden haben Kundennummern die mit "99" beginnen.

Verwendung:
  python scripts/create_test_data.py
  
Optional mit anderer API-URL:
  API_URL=http://192.168.1.100:8000 python scripts/create_test_data.py
"""

import requests
import random
from datetime import datetime, timedelta
import os
import sys

# Konfiguration
API_URL = os.environ.get("API_URL", "http://localhost:8000")
NUM_CUSTOMERS = 250
NUM_CONTRACTS = 650

# Testdaten-Präfix für Kundennummern (99XXXXXX)
KUNDENNUMMER_PREFIX = "99"

# Deutsche Städte für realistische Daten
CITIES = [
    ("Berlin", "10115"), ("Hamburg", "20095"), ("München", "80331"),
    ("Köln", "50667"), ("Frankfurt", "60311"), ("Stuttgart", "70173"),
    ("Düsseldorf", "40213"), ("Leipzig", "04109"), ("Dortmund", "44137"),
    ("Essen", "45127"), ("Bremen", "28195"), ("Dresden", "01067"),
    ("Hannover", "30159"), ("Nürnberg", "90402"), ("Duisburg", "47051"),
    ("Bochum", "44787"), ("Wuppertal", "42103"), ("Bielefeld", "33602"),
    ("Bonn", "53111"), ("Münster", "48143"), ("Karlsruhe", "76131"),
    ("Mannheim", "68161"), ("Augsburg", "86150"), ("Wiesbaden", "65183"),
    ("Gelsenkirchen", "45879"), ("Mönchengladbach", "41061"), ("Braunschweig", "38100"),
    ("Chemnitz", "09111"), ("Kiel", "24103"), ("Aachen", "52062"),
]

# Vor- und Nachnamen
FIRST_NAMES = [
    "Anna", "Max", "Sophie", "Paul", "Emma", "Leon", "Mia", "Ben", "Hannah", "Lukas",
    "Lena", "Felix", "Marie", "Jonas", "Lea", "Tim", "Laura", "Finn", "Sarah", "Noah",
    "Julia", "Elias", "Lisa", "David", "Johanna", "Niklas", "Katharina", "Moritz", "Jennifer", "Jan"
]

LAST_NAMES = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer", "Wagner", "Becker",
    "Schulz", "Hoffmann", "Schäfer", "Koch", "Bauer", "Richter", "Klein", "Wolf",
    "Schröder", "Neumann", "Schwarz", "Zimmermann", "Braun", "Krüger", "Hofmann",
    "Hartmann", "Lange", "Schmitt", "Werner", "Schmitz", "Krause", "Meier"
]


def create_customer(session: requests.Session, index: int) -> dict:
    """Erstellt einen Testkunden"""
    city, plz = random.choice(CITIES)
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    
    # Kundennummer: 99 + 6 Ziffern (z.B. 99000001)
    kundennummer = f"{KUNDENNUMMER_PREFIX}{index:06d}"
    
    customer_data = {
        "name": first_name,
        "name2": last_name,
        "ort": city,
        "plz": plz,
        "kundennummer": kundennummer,
        "land": "Deutschland"
    }
    
    response = session.post(f"{API_URL}/api/customers", json=customer_data)
    if response.status_code == 200:
        data = response.json()
        # API gibt entweder {"data": ...} oder direkt die Daten zurück
        return data.get("data") if "data" in data else data
    else:
        print(f"Fehler beim Erstellen von Kunde {kundennummer}: {response.text}")
        return None


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
        # API gibt entweder {"data": ...} oder direkt die Daten zurück
        return data.get("data") if "data" in data else data
    else:
        print(f"Fehler beim Erstellen von Vertrag: {response.text}")
        return None


def main():
    print(f"=== Testdaten-Generator ===")
    print(f"API-URL: {API_URL}")
    print(f"Erstelle {NUM_CUSTOMERS} Kunden mit {NUM_CONTRACTS} Verträgen...")
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
    
    # Erstelle Kunden
    customers = []
    print(f"Erstelle {NUM_CUSTOMERS} Kunden...")
    for i in range(1, NUM_CUSTOMERS + 1):
        customer = create_customer(session, i)
        if customer:
            customers.append(customer)
        if i % 50 == 0:
            print(f"  {i}/{NUM_CUSTOMERS} Kunden erstellt")
    
    print(f"✓ {len(customers)} Kunden erstellt")
    print()
    
    if not customers:
        print("Keine Kunden erstellt, breche ab.")
        sys.exit(1)
    
    # Erstelle Verträge (verteilt auf Kunden)
    # Manche Kunden haben mehr Verträge als andere
    contracts_created = 0
    print(f"Erstelle {NUM_CONTRACTS} Verträge...")
    
    # Verteilungsstrategie: 
    # - Einige Kunden mit vielen Verträgen (1-5)
    # - Die meisten mit 1-3 Verträgen
    contracts_per_customer = []
    remaining_contracts = NUM_CONTRACTS
    
    for i, customer in enumerate(customers):
        if remaining_contracts <= 0:
            contracts_per_customer.append(0)
            continue
        
        # Wie viele Verträge für diesen Kunden?
        if i < len(customers) * 0.1:  # Top 10% bekommen mehr
            num = min(random.randint(3, 6), remaining_contracts)
        elif i < len(customers) * 0.3:  # Nächste 20% bekommen 2-4
            num = min(random.randint(2, 4), remaining_contracts)
        else:  # Rest bekommt 1-3
            num = min(random.randint(1, 3), remaining_contracts)
        
        contracts_per_customer.append(num)
        remaining_contracts -= num
    
    # Falls noch Verträge übrig, auf erste Kunden verteilen
    while remaining_contracts > 0:
        idx = random.randint(0, len(customers) - 1)
        contracts_per_customer[idx] += 1
        remaining_contracts -= 1
    
    # Erstelle die Verträge
    for i, customer in enumerate(customers):
        for _ in range(contracts_per_customer[i]):
            contract = create_contract(session, customer["id"])
            if contract:
                contracts_created += 1
        
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(customers)} Kunden verarbeitet, {contracts_created} Verträge erstellt")
    
    print(f"✓ {contracts_created} Verträge erstellt")
    print()
    print("=== Fertig! ===")
    print(f"Testkunden haben Kundennummern: {KUNDENNUMMER_PREFIX}000001 - {KUNDENNUMMER_PREFIX}{NUM_CUSTOMERS:06d}")
    print(f"Zum Löschen: python scripts/delete_test_data.py")


if __name__ == "__main__":
    main()
