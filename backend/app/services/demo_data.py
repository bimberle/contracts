"""
Service to create demo data in the demo database.
"""
from datetime import date, timedelta, datetime
from decimal import Decimal
import random
from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.models.contract import Contract


def create_demo_data(db: Session) -> dict:
    """
    Creates demo data for testing purposes.
    Returns a summary of created records.
    """
    # Check if demo data already exists
    existing_customers = db.query(Customer).count()
    if existing_customers > 0:
        return {"message": "Demo-Daten existieren bereits", "customers": existing_customers}
    
    # Demo customer data
    demo_customers = [
        {"kundennummer": "DEMO-001", "name": "Mustermann GmbH", "name2": "Zentrale", "ort": "München", "plz": "80331", "land": "DE"},
        {"kundennummer": "DEMO-002", "name": "Beispiel AG", "name2": None, "ort": "Berlin", "plz": "10115", "land": "DE"},
        {"kundennummer": "DEMO-003", "name": "Test & Partner", "name2": "Niederlassung Süd", "ort": "Stuttgart", "plz": "70173", "land": "DE"},
        {"kundennummer": "DEMO-004", "name": "Muster Handwerk", "name2": None, "ort": "Hamburg", "plz": "20095", "land": "DE"},
        {"kundennummer": "DEMO-005", "name": "Demo Software GmbH", "name2": "Entwicklung", "ort": "Frankfurt", "plz": "60311", "land": "DE"},
        {"kundennummer": "DEMO-006", "name": "Testfirma Schweiz", "name2": None, "ort": "Zürich", "plz": "8001", "land": "CH"},
        {"kundennummer": "DEMO-007", "name": "Beispiel Österreich", "name2": "Filiale Wien", "ort": "Wien", "plz": "1010", "land": "AT"},
        {"kundennummer": "DEMO-008", "name": "Klein & Fein GmbH", "name2": None, "ort": "Köln", "plz": "50667", "land": "DE"},
        {"kundennummer": "DEMO-009", "name": "Großkunde International", "name2": "Hauptsitz", "ort": "Düsseldorf", "plz": "40213", "land": "DE"},
        {"kundennummer": "DEMO-010", "name": "Existenzgründer Start", "name2": None, "ort": "Leipzig", "plz": "04109", "land": "DE"},
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
        
        # Create contracts for this customer
        # First customer gets most contracts, last one is Existenzgründer
        if i == 0:
            # Großkunde - many contracts with high amounts
            num_contracts = 3
        elif i == len(demo_customers) - 1:
            # Existenzgründer - one contract with founder status
            num_contracts = 1
        else:
            # Normal customers - 1-2 contracts
            num_contracts = random.randint(1, 2)
        
        for j in range(num_contracts):
            # Calculate dates
            months_ago = random.randint(6, 60)
            start_date = datetime.combine(today - timedelta(days=months_ago * 30), datetime.min.time())
            
            # Existenzgründer: recent start with founder status
            if i == len(demo_customers) - 1:
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
    db.commit()
    
    return {
        "message": "Alle Daten gelöscht",
        "contracts_deleted": contracts_deleted,
        "customers_deleted": customers_deleted
    }
