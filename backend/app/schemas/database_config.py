"""
Pydantic Schemas für Database Configuration
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class DatabaseConfigBase(BaseModel):
    name: str = Field(..., description="Anzeigename der Datenbank")
    color: str = Field(default="#3B82F6", description="Hex-Farbcode")


class DatabaseConfigCreate(DatabaseConfigBase):
    """Erstellen einer neuen Datenbank"""
    pass


class DatabaseConfigUpdate(BaseModel):
    """Aktualisieren einer Datenbank"""
    name: Optional[str] = None
    color: Optional[str] = None


class DatabaseConfig(DatabaseConfigBase):
    """Vollständige Datenbank-Konfiguration"""
    id: str
    db_name: str = Field(..., alias="dbName")
    is_active: bool = Field(default=False, alias="isActive")
    is_demo: bool = Field(default=False, alias="isDemo")
    is_system: bool = Field(default=False, alias="isSystem")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class DatabaseConfigList(BaseModel):
    """Liste aller Datenbanken"""
    databases: List[DatabaseConfig]
    active_database: Optional[DatabaseConfig] = Field(None, alias="activeDatabase")

    class Config:
        populate_by_name = True


class SwitchDatabaseRequest(BaseModel):
    """Request zum Wechseln der aktiven Datenbank"""
    database_id: str = Field(..., alias="databaseId")

    class Config:
        populate_by_name = True
