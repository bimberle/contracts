"""
Pydantic Schemas für Backup System
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class BackupConfigBase(BaseModel):
    schedule_days: List[str] = Field(default=["monday", "tuesday", "wednesday", "thursday", "friday"], alias="scheduleDays")
    schedule_time: str = Field(default="03:00", alias="scheduleTime")
    max_backups: int = Field(default=7, alias="maxBackups")
    is_enabled: bool = Field(default=True, alias="isEnabled")

    class Config:
        populate_by_name = True


class BackupConfigUpdate(BaseModel):
    schedule_days: Optional[List[str]] = Field(None, alias="scheduleDays")
    schedule_time: Optional[str] = Field(None, alias="scheduleTime")
    max_backups: Optional[int] = Field(None, alias="maxBackups")
    is_enabled: Optional[bool] = Field(None, alias="isEnabled")

    class Config:
        populate_by_name = True


class BackupConfig(BackupConfigBase):
    """Vollständige Backup-Konfiguration"""
    id: str
    last_backup_at: Optional[datetime] = Field(None, alias="lastBackupAt")
    last_backup_status: Optional[str] = Field(None, alias="lastBackupStatus")
    backup_directory: str = Field(..., alias="backupDirectory")
    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class BackupHistoryItem(BaseModel):
    """Ein Backup-Eintrag"""
    id: str
    filename: str
    database_name: str = Field(..., alias="databaseName")
    file_size: Optional[int] = Field(None, alias="fileSize")
    file_size_formatted: Optional[str] = Field(None, alias="fileSizeFormatted")
    status: str
    error_message: Optional[str] = Field(None, alias="errorMessage")
    created_at: datetime = Field(..., alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class BackupHistoryList(BaseModel):
    """Liste aller Backups"""
    backups: List[BackupHistoryItem]
    total_size: int = Field(..., alias="totalSize")
    total_size_formatted: str = Field(..., alias="totalSizeFormatted")

    class Config:
        populate_by_name = True


class CreateBackupRequest(BaseModel):
    """Manuelles Backup erstellen"""
    database_id: Optional[str] = Field(None, alias="databaseId")

    class Config:
        populate_by_name = True


class RestoreBackupRequest(BaseModel):
    """Backup wiederherstellen"""
    backup_id: str = Field(..., alias="backupId")
    target_database_id: str = Field(..., alias="targetDatabaseId")

    class Config:
        populate_by_name = True
