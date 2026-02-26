"""
Backup Service
Handles database backups using pg_dump and pg_restore
"""
import os
import subprocess
import logging
from datetime import datetime
from typing import Optional, List, Tuple
from pathlib import Path

logger = logging.getLogger(__name__)

# Festes Backup-Verzeichnis
BACKUP_DIRECTORY = "/app/backups"


def get_backup_directory() -> str:
    """Gibt das Backup-Verzeichnis zurück und erstellt es falls nötig"""
    Path(BACKUP_DIRECTORY).mkdir(parents=True, exist_ok=True)
    return BACKUP_DIRECTORY


def format_file_size(size_bytes: int) -> str:
    """Formatiert Dateigröße in lesbare Einheit"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"


def get_db_connection_params() -> dict:
    """Extrahiert DB-Verbindungsparameter aus DATABASE_URL"""
    from app.config import settings
    
    # Parse: postgresql://user:password@host:port/dbname
    url = settings.DATABASE_URL
    
    # Entferne Protokoll
    if url.startswith("postgresql://"):
        url = url[13:]
    elif url.startswith("postgres://"):
        url = url[11:]
    
    # Parse user:password@host:port/dbname
    auth_host, dbname = url.rsplit("/", 1)
    auth, host_port = auth_host.rsplit("@", 1)
    user, password = auth.split(":", 1)
    
    if ":" in host_port:
        host, port = host_port.split(":", 1)
    else:
        host = host_port
        port = "5432"
    
    return {
        "host": host,
        "port": port,
        "user": user,
        "password": password,
        "dbname": dbname
    }


def create_backup(db_name: str, backup_name: Optional[str] = None) -> Tuple[bool, str, Optional[str]]:
    """
    Erstellt ein Backup einer Datenbank
    
    Returns:
        Tuple[success, filename_or_error, file_path]
    """
    params = get_db_connection_params()
    backup_dir = get_backup_directory()
    
    if not backup_name:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{db_name}_{timestamp}.sql"
    
    backup_path = os.path.join(backup_dir, backup_name)
    
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = params["password"]
        
        cmd = [
            "pg_dump",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", db_name,
            "-F", "c",  # Custom format (komprimiert)
            "-f", backup_path
        ]
        
        logger.info(f"Creating backup: {backup_name}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Backup failed: {result.stderr}")
            return False, result.stderr, None
        
        logger.info(f"Backup created successfully: {backup_path}")
        return True, backup_name, backup_path
        
    except Exception as e:
        logger.error(f"Backup exception: {str(e)}")
        return False, str(e), None


def restore_backup(backup_filename: str, target_db_name: str) -> Tuple[bool, str]:
    """
    Stellt ein Backup in einer Datenbank wieder her
    
    Returns:
        Tuple[success, message_or_error]
    """
    params = get_db_connection_params()
    backup_dir = get_backup_directory()
    backup_path = os.path.join(backup_dir, backup_filename)
    
    if not os.path.exists(backup_path):
        return False, f"Backup file not found: {backup_filename}"
    
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = params["password"]
        
        # Erst alle Tabellen löschen (clean restore)
        cmd = [
            "pg_restore",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", target_db_name,
            "-c",  # Clean (drop objects before recreating)
            "--if-exists",
            "--no-comments",  # Skip comments that may contain incompatible settings
            backup_path
        ]
        
        logger.info(f"Restoring backup {backup_filename} to {target_db_name}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        # pg_restore kann Warnungen ausgeben, die nicht kritisch sind
        # Ignoriere bekannte harmlose Fehler wie transaction_timeout
        if result.returncode != 0 and "ERROR" in result.stderr:
            # Prüfe ob es nur harmlose Fehler sind
            stderr_lines = result.stderr.strip().split('\n')
            critical_errors = []
            ignorable_patterns = [
                "transaction_timeout",
                "idle_session_timeout", 
                "statement_timeout",
                "does not exist, skipping",
                "already exists"
            ]
            
            for line in stderr_lines:
                if "ERROR" in line:
                    is_ignorable = any(pattern in line for pattern in ignorable_patterns)
                    if not is_ignorable:
                        critical_errors.append(line)
            
            if critical_errors:
                logger.error(f"Restore failed with critical errors: {critical_errors}")
                return False, "\n".join(critical_errors)
            else:
                logger.warning(f"Restore completed with ignorable warnings: {result.stderr}")
        
        logger.info(f"Restore completed for {target_db_name}")
        return True, "Backup erfolgreich wiederhergestellt"
        
    except Exception as e:
        logger.error(f"Restore exception: {str(e)}")
        return False, str(e)


def list_backups() -> List[dict]:
    """Listet alle vorhandenen Backups auf"""
    backup_dir = get_backup_directory()
    backups = []
    
    try:
        for filename in os.listdir(backup_dir):
            if filename.endswith(".sql"):
                filepath = os.path.join(backup_dir, filename)
                stat = os.stat(filepath)
                backups.append({
                    "filename": filename,
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_mtime)
                })
        
        # Sortiere nach Datum (neueste zuerst)
        backups.sort(key=lambda x: x["created"], reverse=True)
        
    except Exception as e:
        logger.error(f"Error listing backups: {str(e)}")
    
    return backups


def delete_backup(filename: str) -> Tuple[bool, str]:
    """Löscht ein Backup"""
    backup_dir = get_backup_directory()
    backup_path = os.path.join(backup_dir, filename)
    
    try:
        if os.path.exists(backup_path):
            os.remove(backup_path)
            logger.info(f"Backup deleted: {filename}")
            return True, "Backup gelöscht"
        else:
            return False, "Backup nicht gefunden"
    except Exception as e:
        logger.error(f"Error deleting backup: {str(e)}")
        return False, str(e)


def cleanup_old_backups(max_backups: int, db_name: Optional[str] = None) -> int:
    """
    Löscht alte Backups, behält nur die neuesten max_backups
    
    Returns:
        Anzahl gelöschter Backups
    """
    backups = list_backups()
    
    # Filtere nach DB-Name wenn angegeben
    if db_name:
        backups = [b for b in backups if b["filename"].startswith(db_name + "_")]
    
    deleted = 0
    if len(backups) > max_backups:
        to_delete = backups[max_backups:]
        for backup in to_delete:
            success, _ = delete_backup(backup["filename"])
            if success:
                deleted += 1
    
    return deleted


def create_database(db_name: str) -> Tuple[bool, str]:
    """Erstellt eine neue PostgreSQL-Datenbank"""
    params = get_db_connection_params()
    
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = params["password"]
        
        # Verbinde zu postgres DB um neue DB zu erstellen
        cmd = [
            "psql",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", "postgres",
            "-c", f"CREATE DATABASE {db_name};"
        ]
        
        logger.info(f"Creating database: {db_name}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            if "already exists" in result.stderr:
                return False, "Datenbank existiert bereits"
            logger.error(f"Create DB failed: {result.stderr}")
            return False, result.stderr
        
        logger.info(f"Database created: {db_name}")
        return True, "Datenbank erstellt"
        
    except Exception as e:
        logger.error(f"Create DB exception: {str(e)}")
        return False, str(e)


def drop_database(db_name: str) -> Tuple[bool, str]:
    """Löscht eine PostgreSQL-Datenbank"""
    params = get_db_connection_params()
    
    # Sicherheitscheck: Nicht die Haupt-DB löschen
    if db_name == params["dbname"]:
        return False, "Die aktive Datenbank kann nicht gelöscht werden"
    
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = params["password"]
        
        # Beende alle Verbindungen zur DB
        terminate_cmd = [
            "psql",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", "postgres",
            "-c", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{db_name}';"
        ]
        subprocess.run(terminate_cmd, env=env, capture_output=True, text=True)
        
        # Lösche die DB
        cmd = [
            "psql",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", "postgres",
            "-c", f"DROP DATABASE IF EXISTS {db_name};"
        ]
        
        logger.info(f"Dropping database: {db_name}")
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        
        if result.returncode != 0:
            logger.error(f"Drop DB failed: {result.stderr}")
            return False, result.stderr
        
        logger.info(f"Database dropped: {db_name}")
        return True, "Datenbank gelöscht"
        
    except Exception as e:
        logger.error(f"Drop DB exception: {str(e)}")
        return False, str(e)


def database_exists(db_name: str) -> bool:
    """Prüft ob eine Datenbank existiert"""
    params = get_db_connection_params()
    
    try:
        env = os.environ.copy()
        env["PGPASSWORD"] = params["password"]
        
        cmd = [
            "psql",
            "-h", params["host"],
            "-p", params["port"],
            "-U", params["user"],
            "-d", "postgres",
            "-t",
            "-c", f"SELECT 1 FROM pg_database WHERE datname = '{db_name}';"
        ]
        
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
        return "1" in result.stdout
        
    except Exception:
        return False
