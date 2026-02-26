"""
Backup Configuration Model
Speichert Backup-Einstellungen und -Historie
"""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base
import uuid


class BackupConfig(Base):
    """
    Backup-Konfiguration (Singleton - id='default')
    """
    __tablename__ = "backup_configs"

    id = Column(String, primary_key=True, default="default")
    
    # Zeitplan: Wochentage (0=Montag, 6=Sonntag)
    schedule_days = Column(JSON, default=[0, 1, 2, 3, 4])  # Mo-Fr standardmäßig
    schedule_time = Column(String, default="03:00")  # Uhrzeit HH:MM
    
    # Retention
    max_backups = Column(Integer, default=7)  # Anzahl Backups die vorgehalten werden
    
    # Status
    is_enabled = Column(Boolean, default=True)
    last_backup_at = Column(DateTime, nullable=True)
    last_backup_status = Column(String, nullable=True)  # "success", "failed"
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class BackupHistory(Base):
    """
    Backup-Historie - Liste aller erstellten Backups
    """
    __tablename__ = "backup_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    filename = Column(String, nullable=False)  # Dateiname des Backups
    database_name = Column(String, nullable=False)  # Von welcher DB
    file_size = Column(Integer, nullable=True)  # Größe in Bytes
    
    status = Column(String, default="success")  # "success", "failed"
    error_message = Column(String, nullable=True)
    
    created_at = Column(DateTime, server_default=func.now())
