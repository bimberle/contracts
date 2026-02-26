"""
Database Management Service
Verwaltet mehrere Datenbanken und deren Konfiguration
"""
import os
import json
import logging
from typing import Optional, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Konfigurationsdatei für Datenbanken (außerhalb der DB selbst)
CONFIG_FILE = "/app/data/databases.json"


def _ensure_config_dir():
    """Stellt sicher, dass das Config-Verzeichnis existiert"""
    Path(os.path.dirname(CONFIG_FILE)).mkdir(parents=True, exist_ok=True)


def _load_config() -> dict:
    """Lädt die Datenbank-Konfiguration aus der JSON-Datei"""
    _ensure_config_dir()
    
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading config: {e}")
    
    # Default-Konfiguration
    return {
        "databases": [
            {
                "id": "prod",
                "name": "PROD",
                "db_name": "contracts",
                "color": "#10B981",  # Grün
                "is_active": True,
                "is_demo": False,
                "is_system": False
            },
            {
                "id": "demo",
                "name": "DEMO",
                "db_name": "contracts_demo",
                "color": "#F59E0B",  # Orange
                "is_active": False,
                "is_demo": True,
                "is_system": False
            }
        ],
        "active_database_id": "prod"
    }


def _save_config(config: dict):
    """Speichert die Datenbank-Konfiguration"""
    _ensure_config_dir()
    
    try:
        with open(CONFIG_FILE, 'w') as f:
            json.dump(config, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving config: {e}")
        raise


def get_all_databases() -> List[dict]:
    """Gibt alle konfigurierten Datenbanken zurück"""
    config = _load_config()
    return config.get("databases", [])


def get_active_database() -> Optional[dict]:
    """Gibt die aktuell aktive Datenbank zurück"""
    config = _load_config()
    active_id = config.get("active_database_id")
    
    for db in config.get("databases", []):
        if db["id"] == active_id:
            return db
    
    return None


def get_database_by_id(db_id: str) -> Optional[dict]:
    """Gibt eine Datenbank anhand ihrer ID zurück"""
    config = _load_config()
    
    for db in config.get("databases", []):
        if db["id"] == db_id:
            return db
    
    return None


def switch_database(db_id: str) -> Tuple[bool, str]:
    """
    Wechselt zur angegebenen Datenbank.
    Ändert die aktive DB in der Konfiguration.
    Die Anwendung muss neu gestartet werden, damit die Änderung wirkt.
    """
    config = _load_config()
    
    # Prüfe ob DB existiert
    db_found = None
    for db in config.get("databases", []):
        if db["id"] == db_id:
            db_found = db
            break
    
    if not db_found:
        return False, "Datenbank nicht gefunden"
    
    if db_found.get("is_system"):
        return False, "System-Datenbank kann nicht aktiviert werden"
    
    # Setze alle auf inaktiv
    for db in config["databases"]:
        db["is_active"] = False
    
    # Aktiviere die gewählte
    db_found["is_active"] = True
    config["active_database_id"] = db_id
    
    _save_config(config)
    
    # Aktualisiere die DATABASE_URL Umgebungsvariable
    # Dies wirkt erst nach einem Neustart des Containers
    logger.info(f"Switched to database: {db_found['name']} ({db_found['db_name']})")
    
    return True, f"Datenbank gewechselt zu {db_found['name']}. Bitte App neu starten."


def create_database_config(name: str, color: str = "#3B82F6") -> Tuple[bool, str, Optional[dict]]:
    """Erstellt eine neue Datenbank-Konfiguration"""
    from app.services.backup_service import create_database, database_exists
    from app.database import Base, get_engine_for_database
    import uuid
    
    config = _load_config()
    
    # Generiere DB-Namen aus dem Anzeigenamen
    db_name = f"contracts_{name.lower().replace(' ', '_')}"
    
    # Prüfe Duplikate
    for db in config.get("databases", []):
        if db["name"].lower() == name.lower():
            return False, "Name existiert bereits", None
        if db["db_name"] == db_name:
            return False, "Datenbank existiert bereits", None
    
    # Erstelle die PostgreSQL-Datenbank
    if not database_exists(db_name):
        success, msg = create_database(db_name)
        if not success:
            return False, f"Fehler beim Erstellen der DB: {msg}", None
    
    # Erstelle Schema in der neuen Datenbank
    try:
        new_engine = get_engine_for_database(db_name)
        Base.metadata.create_all(bind=new_engine)
        logger.info(f"Schema created in database '{db_name}'")
    except Exception as e:
        logger.error(f"Failed to create schema in new database: {e}")
        return False, f"Fehler beim Erstellen des Schemas: {e}", None
    
    # Füge zur Konfiguration hinzu
    new_db = {
        "id": str(uuid.uuid4()),
        "name": name,
        "db_name": db_name,
        "color": color,
        "is_active": False,
        "is_demo": False,
        "is_system": False
    }
    
    config["databases"].append(new_db)
    _save_config(config)
    
    logger.info(f"Created database config: {name}")
    return True, "Datenbank erstellt", new_db


def update_database_config(db_id: str, name: Optional[str] = None, color: Optional[str] = None) -> Tuple[bool, str]:
    """Aktualisiert eine Datenbank-Konfiguration"""
    config = _load_config()
    
    for db in config.get("databases", []):
        if db["id"] == db_id:
            if name:
                # Prüfe auf Duplikate
                for other_db in config.get("databases", []):
                    if other_db["id"] != db_id and other_db["name"].lower() == name.lower():
                        return False, "Name existiert bereits"
                db["name"] = name
            if color:
                db["color"] = color
            
            _save_config(config)
            logger.info(f"Updated database config: {db_id}")
            return True, "Datenbank aktualisiert"
    
    return False, "Datenbank nicht gefunden"


def delete_database_config(db_id: str) -> Tuple[bool, str]:
    """Löscht eine Datenbank-Konfiguration und optional die DB selbst"""
    from app.services.backup_service import drop_database
    
    config = _load_config()
    
    for i, db in enumerate(config.get("databases", [])):
        if db["id"] == db_id:
            if db.get("is_demo"):
                return False, "Demo-Datenbank kann nicht gelöscht werden"
            if db.get("is_active"):
                return False, "Aktive Datenbank kann nicht gelöscht werden"
            if db.get("is_system"):
                return False, "System-Datenbank kann nicht gelöscht werden"
            
            # Lösche die PostgreSQL-Datenbank
            success, msg = drop_database(db["db_name"])
            if not success and "does not exist" not in msg.lower():
                logger.warning(f"Could not drop database {db['db_name']}: {msg}")
            
            # Entferne aus Konfiguration
            config["databases"].pop(i)
            _save_config(config)
            
            logger.info(f"Deleted database config: {db_id}")
            return True, "Datenbank gelöscht"
    
    return False, "Datenbank nicht gefunden"


def initialize_demo_database():
    """
    Initialisiert die Demo-Datenbank mit Schema.
    Wird beim Start aufgerufen, wenn die Demo-DB noch nicht existiert.
    """
    from app.services.backup_service import database_exists, create_database
    from app.database import Base, get_engine_for_database
    
    config = _load_config()
    
    # Finde Demo-DB
    demo_db = None
    for db in config.get("databases", []):
        if db.get("is_demo"):
            demo_db = db
            break
    
    if not demo_db:
        return
    
    db_name = demo_db["db_name"]
    
    # Erstelle Demo-DB falls nicht vorhanden
    if not database_exists(db_name):
        success, msg = create_database(db_name)
        if success:
            logger.info(f"Demo database '{db_name}' created")
        else:
            logger.error(f"Failed to create demo database: {msg}")
            return
    
    # Erstelle Tabellen in der Demo-DB
    try:
        demo_engine = get_engine_for_database(db_name)
        Base.metadata.create_all(bind=demo_engine)
        logger.info(f"Schema created in demo database '{db_name}'")
    except Exception as e:
        logger.error(f"Failed to create schema in demo database: {e}")
