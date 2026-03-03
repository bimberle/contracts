#!/usr/bin/env python3
"""
Löscht alle Testdaten (Kunden mit Kundennummern die mit "99" beginnen).
Die zugehörigen Verträge werden automatisch kaskadiert gelöscht.

Verwendung:
  python scripts/delete_test_data.py
  
Optional mit anderer API-URL:
  API_URL=http://192.168.1.100:8000 python scripts/delete_test_data.py
"""

import requests
import os
import sys

# Konfiguration
API_URL = os.environ.get("API_URL", "http://localhost:8000")

# Testdaten-Präfix für Kundennummern
KUNDENNUMMER_PREFIX = "99"


def main():
    print(f"=== Testdaten-Löschung ===")
    print(f"API-URL: {API_URL}")
    print(f"Lösche alle Kunden mit Kundennummern die mit '{KUNDENNUMMER_PREFIX}' beginnen...")
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
    
    # Hole alle Kunden
    print("Lade Kundenliste...")
    response = session.get(f"{API_URL}/api/customers")
    if response.status_code != 200:
        print(f"Fehler beim Laden der Kunden: {response.text}")
        sys.exit(1)
    
    all_customers = response.json()["data"]
    print(f"Gefunden: {len(all_customers)} Kunden insgesamt")
    
    # Filtere Testkunden
    test_customers = [c for c in all_customers if c["kundennummer"].startswith(KUNDENNUMMER_PREFIX)]
    print(f"Davon Testkunden: {len(test_customers)}")
    print()
    
    if not test_customers:
        print("Keine Testkunden zum Löschen gefunden.")
        sys.exit(0)
    
    # Bestätigung
    confirm = input(f"Wirklich {len(test_customers)} Testkunden (und deren Verträge) löschen? [j/N]: ")
    if confirm.lower() != "j":
        print("Abgebrochen.")
        sys.exit(0)
    
    print()
    print("Lösche Testkunden...")
    
    deleted_count = 0
    error_count = 0
    
    for i, customer in enumerate(test_customers):
        response = session.delete(f"{API_URL}/api/customers/{customer['id']}")
        if response.status_code == 200:
            deleted_count += 1
        else:
            error_count += 1
            print(f"  Fehler beim Löschen von {customer['kundennummer']}: {response.text}")
        
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(test_customers)} verarbeitet")
    
    print()
    print("=== Fertig! ===")
    print(f"✓ {deleted_count} Kunden (und deren Verträge) gelöscht")
    if error_count > 0:
        print(f"✗ {error_count} Fehler")


if __name__ == "__main__":
    main()
