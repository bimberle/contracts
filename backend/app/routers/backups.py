"""
Backup Router
API-Endpunkte für Backup-Verwaltung
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
from app.services import backup_service, database_service

router = APIRouter(tags=["backups"])

# In-Memory Backup-Konfiguration (wird später in DB gespeichert)
_backup_config = {
    "id": "default",
    "schedule_days": ["monday", "tuesday", "wednesday", "thursday", "friday"],  # Mo-Fr
    "schedule_time": "03:00",
    "max_backups": 7,
    "is_enabled": True,
    "last_backup_at": None,
    "last_backup_status": None,
    "created_at": datetime.now(),
    "updated_at": datetime.now()
}


@router.get("/config", response_model=dict)
def get_backup_config():
    """Gibt die aktuelle Backup-Konfiguration zurück"""
    backup_dir = backup_service.get_backup_directory()
    
    return {
        "status": "success",
        "data": {
            "id": _backup_config["id"],
            "scheduleDays": _backup_config["schedule_days"],
            "scheduleTime": _backup_config["schedule_time"],
            "maxBackups": _backup_config["max_backups"],
            "isEnabled": _backup_config["is_enabled"],
            "lastBackupAt": _backup_config["last_backup_at"].isoformat() if _backup_config["last_backup_at"] else None,
            "lastBackupStatus": _backup_config["last_backup_status"],
            "backupDirectory": backup_dir,
            "createdAt": _backup_config["created_at"].isoformat(),
            "updatedAt": _backup_config["updated_at"].isoformat()
        }
    }


@router.put("/config", response_model=dict)
def update_backup_config(request: BackupConfigUpdate):
    """Aktualisiert die Backup-Konfiguration"""
    global _backup_config
    
    if request.schedule_days is not None:
        _backup_config["schedule_days"] = request.schedule_days
    if request.schedule_time is not None:
        _backup_config["schedule_time"] = request.schedule_time
    if request.max_backups is not None:
        _backup_config["max_backups"] = request.max_backups
    if request.is_enabled is not None:
        _backup_config["is_enabled"] = request.is_enabled
    
    _backup_config["updated_at"] = datetime.now()
    
    return {
        "status": "success",
        "message": "Backup-Konfiguration aktualisiert"
    }


@router.get("/history", response_model=dict)
def get_backup_history():
    """Listet alle vorhandenen Backups auf"""
    backups = backup_service.list_backups()
    
    result = []
    total_size = 0
    
    for backup in backups:
        size = backup.get("size", 0)
        total_size += size
        
        # Extrahiere DB-Namen aus Dateiname
        filename = backup["filename"]
        db_name = filename.rsplit("_", 2)[0] if "_" in filename else "unknown"
        
        result.append({
            "id": filename,  # Verwende Dateiname als ID
            "filename": filename,
            "databaseName": db_name,
            "fileSize": size,
            "fileSizeFormatted": backup_service.format_file_size(size),
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
def create_backup(request: CreateBackupRequest = None):
    """Erstellt ein manuelles Backup"""
    global _backup_config
    
    # Hole die aktive oder angegebene Datenbank
    if request and request.database_id:
        db = database_service.get_database_by_id(request.database_id)
        if not db:
            raise HTTPException(status_code=404, detail="Datenbank nicht gefunden")
        db_name = db["db_name"]
    else:
        active_db = database_service.get_active_database()
        if not active_db:
            raise HTTPException(status_code=400, detail="Keine aktive Datenbank")
        db_name = active_db["db_name"]
    
    # Prüfe ob die Datenbank physisch existiert
    if not backup_service.database_exists(db_name):
        raise HTTPException(
            status_code=400, 
            detail=f"Datenbank '{db_name}' existiert nicht in PostgreSQL. Bitte zuerst zur PROD-Datenbank wechseln oder die Demo-Datenbank initialisieren."
        )
    
    success, result, filepath = backup_service.create_backup(db_name)
    
    if success:
        _backup_config["last_backup_at"] = datetime.now()
        _backup_config["last_backup_status"] = "success"
        
        # Cleanup alte Backups
        backup_service.cleanup_old_backups(_backup_config["max_backups"], db_name)
        
        return {
            "status": "success",
            "message": "Backup erstellt",
            "data": {
                "filename": result,
                "databaseName": db_name
            }
        }
    else:
        _backup_config["last_backup_status"] = "failed"
        raise HTTPException(status_code=500, detail=f"Backup fehlgeschlagen: {result}")


@router.post("/restore", response_model=dict)
def restore_backup(request: RestoreBackupRequest):
    """Stellt ein Backup in einer Datenbank wieder her"""
    # Hole Ziel-Datenbank
    target_db = database_service.get_database_by_id(request.target_database_id)
    if not target_db:
        raise HTTPException(status_code=404, detail="Ziel-Datenbank nicht gefunden")
    
    # Prüfe ob Backup existiert
    backup_dir = backup_service.get_backup_directory()
    backup_path = os.path.join(backup_dir, request.backup_id)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup nicht gefunden")
    
    success, message = backup_service.restore_backup(request.backup_id, target_db["db_name"])
    
    if not success:
        raise HTTPException(status_code=500, detail=f"Restore fehlgeschlagen: {message}")
    
    return {
        "status": "success",
        "message": f"Backup wiederhergestellt in {target_db['name']}"
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
