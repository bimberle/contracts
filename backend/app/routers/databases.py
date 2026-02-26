"""
Database Management Router
API-Endpunkte für Datenbank-Verwaltung
"""
from fastapi import APIRouter, HTTPException, status
from typing import List
from datetime import datetime
from app.schemas.database_config import (
    DatabaseConfig,
    DatabaseConfigCreate,
    DatabaseConfigUpdate,
    DatabaseConfigList,
    SwitchDatabaseRequest
)
from app.services import database_service

router = APIRouter(tags=["databases"])


@router.get("", response_model=dict)
def list_databases():
    """Listet alle konfigurierten Datenbanken auf"""
    databases = database_service.get_all_databases()
    active_db = database_service.get_active_database()
    
    # Konvertiere zu Pydantic-kompatiblen Dicts mit Timestamps
    result = []
    for db in databases:
        result.append({
            "id": db["id"],
            "name": db["name"],
            "dbName": db["db_name"],
            "color": db.get("color", "#3B82F6"),
            "isActive": db.get("is_active", False),
            "isDemo": db.get("is_demo", False),
            "isSystem": db.get("is_system", False),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        })
    
    active_result = None
    if active_db:
        active_result = {
            "id": active_db["id"],
            "name": active_db["name"],
            "dbName": active_db["db_name"],
            "color": active_db.get("color", "#3B82F6"),
            "isActive": True,
            "isDemo": active_db.get("is_demo", False),
            "isSystem": active_db.get("is_system", False),
            "createdAt": datetime.now().isoformat(),
            "updatedAt": datetime.now().isoformat()
        }
    
    return {
        "status": "success",
        "data": {
            "databases": result,
            "activeDatabase": active_result
        }
    }


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_database(request: DatabaseConfigCreate):
    """Erstellt eine neue Datenbank"""
    success, message, db = database_service.create_database_config(
        name=request.name,
        color=request.color
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message,
        "data": {
            "id": db["id"],
            "name": db["name"],
            "dbName": db["db_name"],
            "color": db.get("color", "#3B82F6"),
            "isActive": db.get("is_active", False),
            "isDemo": db.get("is_demo", False),
            "isSystem": db.get("is_system", False)
        }
    }


# ==================== Statische Routen HIER (vor /{database_id}) ====================

@router.get("/active", response_model=dict)
def get_active_database():
    """Gibt die aktuell aktive Datenbank zurück"""
    active_db = database_service.get_active_database()
    
    if not active_db:
        raise HTTPException(status_code=404, detail="Keine aktive Datenbank konfiguriert")
    
    return {
        "status": "success",
        "data": {
            "id": active_db["id"],
            "name": active_db["name"],
            "dbName": active_db["db_name"],
            "color": active_db.get("color", "#3B82F6"),
            "isActive": True,
            "isDemo": active_db.get("is_demo", False),
            "isSystem": active_db.get("is_system", False)
        }
    }


@router.post("/switch", response_model=dict)
def switch_database(request: SwitchDatabaseRequest):
    """Wechselt zur angegebenen Datenbank"""
    success, message = database_service.switch_database(request.database_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message,
        "requiresRestart": True
    }


@router.post("/demo-data", response_model=dict)
def create_demo_data_endpoint():
    """Erstellt Demo-Daten in der aktuellen Datenbank"""
    from app.database import SessionLocal
    from app.services.demo_data import create_demo_data
    
    db = SessionLocal()
    try:
        result = create_demo_data(db)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


@router.delete("/demo-data", response_model=dict)
def clear_demo_data_endpoint():
    """Löscht alle Daten in der aktuellen Datenbank (Vorsicht!)"""
    from app.database import SessionLocal
    from app.services.demo_data import clear_demo_data
    
    db = SessionLocal()
    try:
        result = clear_demo_data(db)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()


# ==================== Dynamische Routen mit Parameter ====================

@router.put("/{database_id}", response_model=dict)
def update_database(database_id: str, request: DatabaseConfigUpdate):
    """Aktualisiert eine Datenbank-Konfiguration"""
    success, message = database_service.update_database_config(
        db_id=database_id,
        name=request.name,
        color=request.color
    )
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message
    }


@router.delete("/{database_id}", response_model=dict)
def delete_database(database_id: str):
    """Löscht eine Datenbank"""
    success, message = database_service.delete_database_config(database_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "status": "success",
        "message": message
    }
