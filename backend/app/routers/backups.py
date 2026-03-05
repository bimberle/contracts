"""
Backup Router
API-Endpunkte für Backup-Verwaltung (Single Database)
"""
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from typing import Optional
from datetime import datetime
import os

from app.schemas.backup import (
    BackupConfig,
    BackupConfigUpdate,
    BackupHistoryItem,
    BackupHistoryList,
    CreateBackupRequest,
    RestoreBackupRequest
)
from app.services import backup_service
from app.services.scheduler_service import update_backup_schedule, get_next_backup_time
from app.config import settings
from app.database import SessionLocal
from app.models.backup import BackupConfig as BackupConfigModel, BackupHistory

router = APIRouter(tags=["backups"])


def _get_db_name() -> str:
    """Extrahiert den Datenbanknamen aus der DATABASE_URL"""
    url = settings.DATABASE_URL
    # Parse: postgresql://user:password@host:port/dbname
    return url.rsplit("/", 1)[-1]


def _get_or_create_config(db) -> BackupConfigModel:
    """Get or create the backup config from database"""
    config = db.query(BackupConfigModel).filter(BackupConfigModel.id == "default").first()
    if not config:
        config = BackupConfigModel(
            id="default",
            schedule_days=["monday", "tuesday", "wednesday", "thursday", "friday"],
            schedule_time="03:00",
            max_backups=7,
            is_enabled=True
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.get("/config", response_model=dict)
def get_backup_config():
    """Gibt die aktuelle Backup-Konfiguration zurück"""
    backup_dir = backup_service.get_backup_directory()
    
    db = SessionLocal()
    try:
        config = _get_or_create_config(db)
        next_backup = get_next_backup_time()
        
        return {
            "status": "success",
            "data": {
                "id": config.id,
                "scheduleDays": config.schedule_days or [],
                "scheduleTime": config.schedule_time or "03:00",
                "maxBackups": config.max_backups or 7,
                "isEnabled": config.is_enabled if config.is_enabled is not None else True,
                "lastBackupAt": config.last_backup_at.isoformat() if config.last_backup_at else None,
                "lastBackupStatus": config.last_backup_status,
                "nextBackupAt": next_backup.isoformat() if next_backup else None,
                "backupDirectory": backup_dir,
                "createdAt": config.created_at.isoformat() if config.created_at else None,
                "updatedAt": config.updated_at.isoformat() if config.updated_at else None
            }
        }
    finally:
        db.close()


@router.put("/config", response_model=dict)
def update_backup_config_endpoint(request: BackupConfigUpdate):
    """Aktualisiert die Backup-Konfiguration"""
    db = SessionLocal()
    try:
        config = _get_or_create_config(db)
        
        if request.schedule_days is not None:
            config.schedule_days = request.schedule_days
        if request.schedule_time is not None:
            config.schedule_time = request.schedule_time
        if request.max_backups is not None:
            config.max_backups = request.max_backups
        if request.is_enabled is not None:
            config.is_enabled = request.is_enabled
        
        config.updated_at = datetime.now()
        db.commit()
        
        # Update the scheduler with new configuration
        update_backup_schedule(
            schedule_days=config.schedule_days or [],
            schedule_time=config.schedule_time or "03:00",
            is_enabled=config.is_enabled if config.is_enabled is not None else True
        )
        
        next_backup = get_next_backup_time()
        
        return {
            "status": "success",
            "message": "Backup-Konfiguration aktualisiert",
            "data": {
                "nextBackupAt": next_backup.isoformat() if next_backup else None
            }
        }
    finally:
        db.close()


@router.get("/history", response_model=dict)
def get_backup_history():
    """Listet alle vorhandenen Backups auf"""
    backups = backup_service.list_backups()
    
    # Lade gespeicherte Metadaten aus der DB
    history_map = {}
    db = SessionLocal()
    try:
        history_entries = db.query(BackupHistory).all()
        for entry in history_entries:
            history_map[entry.filename] = {
                "customer_count": entry.customer_count,
                "contract_count": entry.contract_count,
                "app_version": getattr(entry, 'app_version', None)
            }
    except Exception as e:
        # Falls DB-Abfrage fehlschlägt, weiter ohne Metadaten
        pass
    finally:
        db.close()
    
    result = []
    total_size = 0
    
    for backup in backups:
        size = backup.get("size", 0)
        total_size += size
        
        # Extrahiere DB-Namen aus Dateiname
        filename = backup["filename"]
        db_name = filename.rsplit("_", 2)[0] if "_" in filename else "unknown"
        
        # Hole Metadaten aus der DB
        meta = history_map.get(filename, {})
        
        result.append({
            "id": filename,  # Verwende Dateiname als ID
            "filename": filename,
            "databaseName": db_name,
            "fileSize": size,
            "fileSizeFormatted": backup_service.format_file_size(size),
            "customerCount": meta.get("customer_count"),
            "contractCount": meta.get("contract_count"),
            "appVersion": meta.get("app_version"),
            "status": "success",
            "errorMessage": None,
            "createdAt": backup["created"].isoformat()
        })
    
    return {
        "status": "success",
        "data": {
            "backups": result,
            "totalSize": total_size,
            "totalSizeFormatted": backup_service.format_file_size(total_size)
        }
    }


@router.post("/create", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_backup_endpoint(request: CreateBackupRequest = None):
    """Erstellt ein manuelles Backup"""
    from app.models.customer import Customer
    from app.models.contract import Contract
    
    db_name = _get_db_name()
    
    # Prüfe ob die Datenbank physisch existiert
    if not backup_service.database_exists(db_name):
        raise HTTPException(
            status_code=400, 
            detail=f"Datenbank '{db_name}' existiert nicht in PostgreSQL."
        )
    
    db = SessionLocal()
    try:
        # Zähle Kunden und Verträge vor dem Backup
        customer_count = db.query(Customer).count()
        contract_count = db.query(Contract).count()
        
        success, result, filepath = backup_service.create_backup(db_name)
        
        # Get config from DB
        config = _get_or_create_config(db)
        
        if success:
            config.last_backup_at = datetime.now()
            config.last_backup_status = "success"
            
            # Speichere Backup-Historie
            from app.main import BACKEND_VERSION
            
            # Hole Dateigröße
            file_size = os.path.getsize(filepath) if filepath and os.path.exists(filepath) else 0
            
            history_entry = BackupHistory(
                filename=result,
                database_name=db_name,
                file_size=file_size,
                customer_count=customer_count,
                contract_count=contract_count,
                app_version=BACKEND_VERSION,
                status="success"
            )
            db.add(history_entry)
            db.commit()
            
            # Cleanup alte Backups
            max_backups = config.max_backups or 7
            backup_service.cleanup_old_backups(max_backups, db_name)
            
            return {
                "status": "success",
                "message": "Backup erstellt",
                "data": {
                    "filename": result,
                    "databaseName": db_name,
                    "customerCount": customer_count,
                    "contractCount": contract_count
                }
            }
        else:
            config.last_backup_status = "failed"
            db.commit()
            raise HTTPException(status_code=500, detail=f"Backup fehlgeschlagen: {result}")
    finally:
        db.close()


@router.post("/restore", response_model=dict)
def restore_backup(request: RestoreBackupRequest):
    """Stellt ein Backup wieder her"""
    db_name = _get_db_name()
    
    # Prüfe ob Backup existiert
    backup_dir = backup_service.get_backup_directory()
    backup_path = os.path.join(backup_dir, request.backup_id)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")
    
    success, message = backup_service.restore_backup(request.backup_id, db_name)
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Restore fehlgeschlagen: {message}")
    
    return {
        "status": "success",
        "message": f"Backup wiederhergestellt"
    }


@router.get("/download/{filename}")
def download_backup(filename: str):
    """Lädt ein Backup herunter"""
    backup_dir = backup_service.get_backup_directory()
    backup_path = os.path.join(backup_dir, filename)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")
    
    return FileResponse(
        backup_path,
        media_type="application/octet-stream",
        filename=filename
    )


@router.delete("/{filename}", response_model=dict)
def delete_backup(filename: str):
    """Löscht ein Backup"""
    success, message = backup_service.delete_backup(filename)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message
    }
