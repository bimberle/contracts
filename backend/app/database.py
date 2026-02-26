from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings
import os
import json
import logging

logger = logging.getLogger(__name__)

# Die Base muss global sein für Model-Definitionen
Base = declarative_base()

# Cache für Engines pro Datenbank
_engines = {}
_session_locals = {}

# Konfigurationsdatei für Datenbanken
CONFIG_FILE = "/app/data/databases.json"


def _get_base_db_url():
    """Extrahiert Basis-URL ohne Datenbanknamen"""
    # Format: postgresql://user:password@host:port/dbname
    url = settings.DATABASE_URL
    # Entferne den letzten Teil (Datenbankname)
    base_url = url.rsplit('/', 1)[0]
    return base_url


def _load_active_db_name() -> str:
    """Lädt den Namen der aktiven Datenbank aus der Konfiguration"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                config = json.load(f)
                active_id = config.get("active_database_id", "prod")
                for db in config.get("databases", []):
                    if db["id"] == active_id:
                        return db.get("db_name", "contracts")
        except Exception as e:
            logger.error(f"Error loading active DB config: {e}")
    
    # Fallback: extrahiere aus DATABASE_URL
    db_name = settings.DATABASE_URL.rsplit('/', 1)[-1]
    return db_name


def get_active_database_url() -> str:
    """Gibt die URL der aktuell aktiven Datenbank zurück"""
    db_name = _load_active_db_name()
    base_url = _get_base_db_url()
    return f"{base_url}/{db_name}"


def get_engine_for_database(db_name: str = None):
    """
    Gibt einen SQLAlchemy Engine für die angegebene Datenbank zurück.
    Verwendet Caching für Effizienz.
    """
    if db_name is None:
        db_name = _load_active_db_name()
    
    if db_name not in _engines:
        base_url = _get_base_db_url()
        db_url = f"{base_url}/{db_name}"
        _engines[db_name] = create_engine(db_url)
        _session_locals[db_name] = sessionmaker(
            autocommit=False, 
            autoflush=False, 
            bind=_engines[db_name]
        )
        logger.info(f"Created engine for database: {db_name}")
    
    return _engines[db_name]


def get_session_local_for_database(db_name: str = None):
    """Gibt einen SessionLocal für die angegebene Datenbank zurück"""
    if db_name is None:
        db_name = _load_active_db_name()
    
    # Stelle sicher, dass Engine existiert
    get_engine_for_database(db_name)
    
    return _session_locals[db_name]


# Standard-Engine für die ursprünglich konfigurierte DB (für Migrationen etc.)
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """
    Dependency für FastAPI Routes um DB-Session zu erhalten.
    Verwendet IMMER die aktuell aktive Datenbank.
    """
    db_name = _load_active_db_name()
    session_local = get_session_local_for_database(db_name)
    db = session_local()
    try:
        yield db
    finally:
        db.close()
