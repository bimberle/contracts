"""
Service to create demo data in the demo database.
"""
from datetime import date, timedelta
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
    
    # Contract types and templates
    contract_templates = [
        {"title": "Office-Miete Premium", "type": "rental", "workstations": 10},
        {"title": "Office-Miete Standard", "type": "rental", "workstations": 5},
        {"title": "Office-Miete Basic", "type": "rental", "workstations": 2},
        {"title": "Software-Pflege Enterprise", "type": "software-care", "workstations": None},
        {"title": "Software-Pflege Standard", "type": "software-care", "workstations": None},
        {"title": "Mobile App Lizenz", "type": "apps", "workstations": None},
        {"title": "Kauf Bestandsvertrag", "type": "purchase", "workstations": None},
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
            # Großkunde - many contracts
            num_contracts = 5
        elif i == len(demo_customers) - 1:
            # Existenzgründer - one contract with founder status
            num_contracts = 1
        else:
            # Normal customers - 1-3 contracts
            num_contracts = random.randint(1, 3)
        
        for j in range(num_contracts):
            template = random.choice(contract_templates)
            
            # Calculate dates
            months_ago = random.randint(6, 60)
            start_date = today - timedelta(days=months_ago * 30)
            
            # Existenzgründer: recent start with founder status
            if i == len(demo_customers) - 1:
                start_date = today - timedelta(days=90)  # 3 months ago
                is_founder = True
            else:
                is_founder = False
            
            # End date: 80% active, 20% completed
            if random.random() > 0.8:
                end_date = today - timedelta(days=random.randint(30, 365))
                status = "completed"
            else:
                end_date = None
                status = "active"
            
            # Calculate price based on type
            if template["type"] == "rental":
                base_price = Decimal("50.00") * (template["workstations"] or 1)
            elif template["type"] == "software-care":
                base_price = Decimal(str(random.randint(100, 500)))
            elif template["type"] == "apps":
                base_price = Decimal(str(random.randint(20, 100)))
            else:
                base_price = Decimal(str(random.randint(50, 200)))
            
            # Add some variance
            price = base_price * Decimal(str(random.uniform(0.8, 1.2)))
            price = price.quantize(Decimal("0.01"))
            
            contract = Contract(
                customer_id=customer.id,
                title=f"{template['title']} #{j+1}",
                type=template["type"],
                price=price,
                currency="EUR" if cust_data["land"] != "CH" else "CHF",
                start_date=start_date,
                end_date=end_date,
                is_founder_discount=is_founder,
                status=status,
                workstations=template["workstations"],
                notes=f"Demo-Vertrag für {cust_data['name']}"
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
