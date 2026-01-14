@echo off
REM ============================================================================
REM Contract Management Webapp - Windows Update Script
REM ============================================================================
REM Dieses Script:
REM 1. Aktualisiert die lokale Git Repository (git pull)
REM 2. Fragt ob Datenbank gelöscht werden soll
REM 3. Zieht neue Docker Images
REM 4. Startet Container neu
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo Contract Management Webapp - Update auf neueste Version
echo ============================================================================
echo.

REM Prüfe ob Docker installiert ist
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker ist nicht installiert oder nicht im PATH
    echo Bitte Docker Desktop installieren: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose ist nicht installiert
    echo Bitte Docker Desktop mit Compose installieren
    pause
    exit /b 1
)

echo [OK] Docker und Docker Compose gefunden
echo.

REM Prüfe ob git installiert ist
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git ist nicht installiert
    echo Bitte Git installieren: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git gefunden
echo.

REM ============================================================================
REM 1. Git Pull - neueste Änderungen laden
REM ============================================================================
echo.
echo ============================================================================
echo SCHRITT 1: Git Repository aktualisieren...
echo ============================================================================
echo.

git pull origin main
if errorlevel 1 (
    echo [ERROR] Git Pull fehlgeschlagen
    pause
    exit /b 1
)

echo [OK] Git Repository aktualisiert
echo.

REM ============================================================================
REM 2. Frage nach Datenbank-Löschung
REM ============================================================================
echo.
echo ============================================================================
echo SCHRITT 2: Datenbank-Management
echo ============================================================================
echo.
echo WARNUNG: Sollen alle Daten aus der Datenbank gelöscht werden?
echo.
echo Option 1: [J]a  - Alle Daten LÖSCHEN (sauberer Fresh-Start)
echo           Nutze dies wenn es Migrations- oder Schema-Probleme gibt
echo.
echo Option 2: [N]ein - Daten BEHALTEN (nur Images aktualisieren)
echo           Nutze dies für normale Updates
echo.

set /p deletedata="Daten löschen? (J/N) [Standard: N]: "
if /i "%deletedata%"=="" set "deletedata=N"

if /i "%deletedata%"=="J" (
    echo.
    echo [INFO] Lösche alle Container und Datenbank-Daten...
    
    docker-compose down -v >nul 2>&1
    
    echo [OK] Container und Datenbank gelöscht
    echo.
    echo [INFO] Lösche auch lokale Docker Volumes...
    docker volume rm contracts_postgres_data >nul 2>&1
    echo [OK] Volumes gelöscht
    echo.
) else (
    echo.
    echo [INFO] Stoppe nur die Container (Daten bleiben erhalten)...
    docker-compose down >nul 2>&1
    echo [OK] Container gestoppt
    echo.
)

REM ============================================================================
REM 3. Neue Images pullen
REM ============================================================================
echo.
echo ============================================================================
echo SCHRITT 3: Neue Docker Images laden...
echo ============================================================================
echo.

docker-compose pull
if errorlevel 1 (
    echo [ERROR] Docker Compose Pull fehlgeschlagen
    pause
    exit /b 1
)

echo [OK] Neue Images geladen
echo.

REM ============================================================================
REM 4. Container neu starten
REM ============================================================================
echo.
echo ============================================================================
echo SCHRITT 4: Container neu starten...
echo ============================================================================
echo.

docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Docker Compose Up fehlgeschlagen
    pause
    exit /b 1
)

echo [OK] Container starten...
echo.
echo [INFO] Warte 60 Sekunden bis Database vollständig initialisiert ist...
timeout /t 60 /nobreak

REM ============================================================================
REM 5. Optional: Migrationen bei Fresh-Start
REM ============================================================================
if /i "%deletedata%"=="J" (
    echo.
    echo ============================================================================
    echo SCHRITT 5: Datenbank-Migrationen ausführen...
    echo ============================================================================
    echo.
    
    docker-compose exec -T backend alembic upgrade head
    if errorlevel 1 (
        echo [WARNING] Migrations möglicherweise fehlgeschlagen, aber nicht kritisch
    ) else (
        echo [OK] Migrationen erfolgreich ausgeführt
    )
    echo.
)

REM ============================================================================
REM Fertig!
REM ============================================================================
echo.
echo ============================================================================
echo [SUCCESS] Update abgeschlossen!
echo ============================================================================
echo.
echo Die Webapp ist nun unter folgende Adressen erreichbar:
echo - Frontend: http://localhost
echo - Backend API: http://localhost/api/
echo - API Docs: http://localhost/api/docs
echo.
echo Logs anschauen:
echo   docker-compose logs
echo.
echo Container neu starten:
echo   docker-compose down && docker-compose up -d
echo.
echo.
pause
