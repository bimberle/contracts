"""
Database Configuration Model
Speichert Informationen über verfügbare Datenbanken
"""
from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base
import uuid


class DatabaseConfig(Base):
    """
    Konfiguration für eine Datenbank-Instanz.
    Wird in der System-Datenbank gespeichert.
    """
    __tablename__ = "database_configs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)  # Anzeigename (z.B. "PROD", "DEMO")
    db_name = Column(String, nullable=False, unique=True)  # PostgreSQL DB Name
    color = Column(String, default="#3B82F6")  # Hex-Farbe für Anzeige
    is_active = Column(Boolean, default=False)  # Ist diese DB gerade aktiv?
    is_demo = Column(Boolean, default=False)  # Ist dies die Demo-DB (nicht löschbar)?
    is_system = Column(Boolean, default=False)  # System-DB (nicht löschbar, nicht wählbar)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
