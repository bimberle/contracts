"""
Service to create demo data in the demo database.
"""
from datetime import date, timedelta, datetime
from decimal import Decimal
import random
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.contract import Contract
from app.models.price_increase import PriceIncrease


def create_demo_data(db: Session) -> dict:
    """
    Creates demo data for testing purposes.
    Returns a summary of created records.
    """
    # Check if demo data already exists
    existing_customers = db.query(Customer).count()
    if existing_customers > 0:
        return {"message": "Demo-Daten existieren bereits", "customers": existing_customers}
    
    today = date.today()
    
    # ========================================
    # PRICE INCREASES (Preiserhoehungen)
    # ========================================
    
    # Alte Preiserhoehung von vor 3 Jahren (fuer manuelles Aktivieren bei neuem Vertrag)
    old_price_increase = PriceIncrease(
        id="pi-old-2023",
        valid_from=datetime.combine(today - timedelta(days=3*365), datetime.min.time()),
        amount_increases={
            "software_rental": 5.0,
            "software_care": 3.0,
            "apps": 2.0,
            "purchase": 0,
            "cloud": 4.0
        },
        lock_in_months=24,
        description="Preiserhoehung 2023 (alt, fuer manuelle Aktivierung)"
    )
    db.add(old_price_increase)
    
    # Aktuelle Preiserhoehung von vor 6 Monaten
    current_price_increase = PriceIncrease(
        id="pi-current-2025",
        valid_from=datetime.combine(today - timedelta(days=180), datetime.min.time()),
        amount_increases={
            "software_rental": 8.0,
            "software_care": 5.0,
            "apps": 3.0,
            "purchase": 2.0,
            "cloud": 6.0
        },
        lock_in_months=24,
        description="Preiserhoehung 2025 (aktuelle)"
    )
    db.add(current_price_increase)
    
    db.flush()  # Get IDs for referencing
    
    # ========================================
    # CUSTOMERS (Kunden)
    # ========================================
    
    # Demo customer data (numerische Kundennummern)
    demo_customers = [
        {"kundennummer": "90000001", "name": "Mustermann GmbH", "name2": "Zentrale", "ort": "Muenchen", "plz": "80331", "land": "DE"},
        {"kundennummer": "90000002", "name": "Beispiel AG", "name2": None, "ort": "Berlin", "plz": "10115", "land": "DE"},
        {"kundennummer": "90000003", "name": "Test & Partner", "name2": "Niederlassung Sued", "ort": "Stuttgart", "plz": "70173", "land": "DE"},
        {"kundennummer": "90000004", "name": "Muster Handwerk", "name2": None, "ort": "Hamburg", "plz": "20095", "land": "DE"},
        {"kundennummer": "90000005", "name": "Demo Software GmbH", "name2": "Entwicklung", "ort": "Frankfurt", "plz": "60311", "land": "DE"},
        {"kundennummer": "90000006", "name": "Testfirma Schweiz", "name2": None, "ort": "Zuerich", "plz": "8001", "land": "CH"},
        {"kundennummer": "90000007", "name": "Beispiel Oesterreich", "name2": "Filiale Wien", "ort": "Wien", "plz": "1010", "land": "AT"},
        {"kundennummer": "90000008", "name": "Klein & Fein GmbH", "name2": None, "ort": "Koeln", "plz": "50667", "land": "DE"},
        {"kundennummer": "90000009", "name": "Grosskunde International", "name2": "Hauptsitz", "ort": "Duesseldorf", "plz": "40213", "land": "DE"},
        {"kundennummer": "90000010", "name": "Existenzgruender Start", "name2": None, "ort": "Leipzig", "plz": "04109", "land": "DE"},
        # Neue spezielle Demo-Kunden
        {"kundennummer": "90000011", "name": "Langzeit Kunde GmbH", "name2": "Ueber 5 Jahre", "ort": "Dresden", "plz": "01067", "land": "DE"},
        {"kundennummer": "90000012", "name": "Ausschluss Test AG", "name2": "Preiserhoehung ausgeschlossen", "ort": "Nuernberg", "plz": "90402", "land": "DE"},
        {"kundennummer": "90000013", "name": "Manuell Aktiviert KG", "name2": "Alte PE aktiviert", "ort": "Bremen", "plz": "28195", "land": "DE"},
        {"kundennummer": "90000014", "name": "Ex-Gruender GmbH", "name2": "Gruenderphase abgelaufen", "ort": "Hannover", "plz": "30159", "land": "DE"},
    ]
    
    created_customers = []
    created_contracts = []
    
    today = date.today()
    
    for i, cust_data in enumerate(demo_customers):
        # Create customer
        customer = Customer(
            kundennummer=cust_data["kundennummer"],
            name=cust_data["name"],
            name2=cust_data["name2"],
            ort=cust_data["ort"],
            plz=cust_data["plz"],
            land=cust_data["land"]
        )
        db.add(customer)
        db.flush()  # Get the ID
        created_customers.append(customer)
        
        # ========================================
        # SPEZIELLE DEMO-VERTRAEGE
        # ========================================
        
        # Kunde 11: Langzeit-Vertrag (ueber Mindestlaufzeit von 60 Monaten)
        if cust_data["kundennummer"] == "90000011":
            # Vertrag der seit 7 Jahren laeuft (ueber 60 Monate Mindestlaufzeit)
            long_running_contract = Contract(
                customer_id=customer.id,
                software_rental_amount=500.0,
                software_care_amount=200.0,
                apps_amount=50.0,
                purchase_amount=100.0,
                cloud_amount=150.0,
                currency="EUR",
                start_date=datetime.combine(today - timedelta(days=7*365), datetime.min.time()),
                end_date=None,
                is_founder_discount=False,
                number_of_seats=10,
                notes="DEMO: Langzeit-Vertrag seit 7 Jahren - ueber Mindestlaufzeit (60 Monate)"
            )
            db.add(long_running_contract)
            created_contracts.append(long_running_contract)
            continue
        
        # Kunde 12: Vertrag mit explizit AUSGESCHLOSSENER Preiserhoehung
        if cust_data["kundennummer"] == "90000012":
            # Vertrag der die aktuelle Preiserhoehung 2025 NICHT bekommt
            excluded_contract = Contract(
                customer_id=customer.id,
                software_rental_amount=400.0,
                software_care_amount=150.0,
                apps_amount=30.0,
                purchase_amount=0,
                cloud_amount=100.0,
                currency="EUR",
                start_date=datetime.combine(today - timedelta(days=3*365), datetime.min.time()),
                end_date=None,
                is_founder_discount=False,
                number_of_seats=5,
                excluded_price_increase_ids=["pi-current-2025"],  # Aktuelle PE ausgeschlossen
                notes="DEMO: Preiserhoehung 2025 ist AUSGESCHLOSSEN (Sondervereinbarung)"
            )
            db.add(excluded_contract)
            created_contracts.append(excluded_contract)
            continue
        
        # Kunde 13: Vertrag mit manuell AKTIVIERTER alter Preiserhoehung
        if cust_data["kundennummer"] == "90000013":
            # Erst einen alten Vertrag erstellen (vor der alten PE 2023)
            old_contract = Contract(
                customer_id=customer.id,
                software_rental_amount=300.0,
                software_care_amount=100.0,
                apps_amount=20.0,
                purchase_amount=50.0,
                cloud_amount=80.0,
                currency="EUR",
                start_date=datetime.combine(today - timedelta(days=5*365), datetime.min.time()),
                end_date=None,
                is_founder_discount=False,
                number_of_seats=3,
                notes="DEMO: Alter Vertrag (vor PE 2023) - PE wird automatisch angewendet"
            )
            db.add(old_contract)
            created_contracts.append(old_contract)
            
            # Dann einen neuen Vertrag (nach der alten PE) mit manueller Aktivierung der alten PE
            manually_activated_contract = Contract(
                customer_id=customer.id,
                software_rental_amount=350.0,
                software_care_amount=120.0,
                apps_amount=25.0,
                purchase_amount=0,
                cloud_amount=90.0,
                currency="EUR",
                start_date=datetime.combine(today - timedelta(days=180), datetime.min.time()),  # 6 Monate alt
                end_date=None,
                is_founder_discount=False,
                number_of_seats=4,
                included_early_price_increase_ids=["pi-old-2023"],  # Alte PE manuell aktiviert
                notes="DEMO: Neue Vertrag - alte PE 2023 MANUELL AKTIVIERT (obwohl Vertrag neuer ist)"
            )
            db.add(manually_activated_contract)
            created_contracts.append(manually_activated_contract)
            continue
        
        # Kunde 14: Existenzgruender mit abgelaufener Gruenderphase
        if cust_data["kundennummer"] == "90000014":
            # Vertrag ist 2 Jahre alt, hat Existenzgruender-Flag, aber Gruenderphase (12 Monate) ist vorbei
            expired_founder_contract = Contract(
                customer_id=customer.id,
                software_rental_amount=280.0,
                software_care_amount=90.0,
                apps_amount=15.0,
                purchase_amount=0,
                cloud_amount=60.0,
                currency="EUR",
                start_date=datetime.combine(today - timedelta(days=2*365), datetime.min.time()),  # 2 Jahre alt
                end_date=None,
                is_founder_discount=True,  # War Existenzgruender
                number_of_seats=2,
                notes="DEMO: Existenzgruender dessen Gruenderphase (12 Monate) bereits abgelaufen ist - zahlt jetzt normal"
            )
            db.add(expired_founder_contract)
            created_contracts.append(expired_founder_contract)
            continue
        
        # ========================================
        # STANDARD DEMO-VERTRAEGE (wie bisher)
        # ========================================
        
        # Create contracts for this customer
        # First customer gets most contracts, Existenzgruender gets one
        if i == 0:
            # Grosskunde - many contracts with high amounts
            num_contracts = 3
        elif cust_data["kundennummer"] == "90000010":
            # Existenzgruender - one contract with founder status
            num_contracts = 1
        else:
            # Normal customers - 1-2 contracts
            num_contracts = random.randint(1, 2)
        
        for j in range(num_contracts):
            # Calculate dates
            months_ago = random.randint(6, 60)
            start_date = datetime.combine(today - timedelta(days=months_ago * 30), datetime.min.time())
            
            # Existenzgruender: recent start with founder status
            if cust_data["kundennummer"] == "90000010":
                start_date = datetime.combine(today - timedelta(days=90), datetime.min.time())
                is_founder = True
            else:
                is_founder = False
            
            # End date: 80% active, 20% completed
            if random.random() > 0.8 and not is_founder:
                end_date = datetime.combine(today - timedelta(days=random.randint(30, 365)), datetime.min.time())
            else:
                end_date = None
            
            # Random amounts for each category
            software_rental = float(random.randint(100, 800)) if random.random() > 0.3 else 0
            software_care = float(random.randint(50, 300)) if random.random() > 0.4 else 0
            apps = float(random.randint(10, 100)) if random.random() > 0.6 else 0
            purchase = float(random.randint(20, 150)) if random.random() > 0.7 else 0
            cloud = float(random.randint(30, 200)) if random.random() > 0.5 else 0
            
            # Number of seats
            seats = random.choice([1, 2, 3, 5, 10, 15, 20])
            
            contract = Contract(
                customer_id=customer.id,
                software_rental_amount=software_rental,
                software_care_amount=software_care,
                apps_amount=apps,
                purchase_amount=purchase,
                cloud_amount=cloud,
                currency="EUR" if cust_data["land"] != "CH" else "CHF",
                start_date=start_date,
                end_date=end_date,
                is_founder_discount=is_founder,
                number_of_seats=seats,
                notes=f"Demo-Vertrag #{j+1} für {cust_data['name']}"
            )
            db.add(contract)
            created_contracts.append(contract)
    
    db.commit()
    
    return {
        "message": "Demo-Daten erfolgreich erstellt",
        "customers": len(created_customers),
        "contracts": len(created_contracts)
    }


def clear_demo_data(db: Session) -> dict:
    """
    Clears all data from the database (use with caution!).
    """
    # Delete contracts first (foreign key)
    contracts_deleted = db.query(Contract).delete()
    customers_deleted = db.query(Customer).delete()
    # Delete price increases
    price_increases_deleted = db.query(PriceIncrease).delete()
    db.commit()
    
    return {
        "message": "Alle Daten geloescht",
        "contracts_deleted": contracts_deleted,
        "customers_deleted": customers_deleted,
        "price_increases_deleted": price_increases_deleted
    }
