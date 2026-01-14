@echo off
REM ============================================================================
REM Contract Management Webapp - Windows Setup Script
REM ============================================================================
REM Dieses Script prüft, ob docker-compose.yml und .env existieren.
REM Wenn nicht: herunterloaden von Git
REM Wenn ja: Images pullen und Container neu starten
REM ============================================================================

setlocal enabledelayedexpansion

REM Farben für Console Output (optional)
for /F %%A in ('echo prompt $H ^| cmd') do set "BS=%%A"

echo.
echo ============================================================================
echo Contract Management Webapp - Windows Setup
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

REM Prüfe ob docker-compose.yml existiert
if not exist "docker-compose.yml" (
    echo [INFO] docker-compose.yml nicht gefunden - lade von Git herunter
    call :download_from_git
    call :ask_for_password
) else (
    echo [OK] docker-compose.yml existiert - starte Update
    call :update_existing
)

echo.
echo ============================================================================
echo Setup abgeschlossen!
echo ============================================================================
echo.
echo Öffne http://localhost im Browser um die Webapp zu nutzen
echo.
pause
exit /b 0

REM ============================================================================
REM Funktion: Frage nach Passwort bei erster Installation
REM ============================================================================
:ask_for_password
echo.
echo [SCHRITT 4] Sicherheitskonfiguration
echo ============================================================================
echo.
echo Bitte geben Sie ein sicheres SECRET_KEY für die Anwendung ein.
echo Dieses wird für die Verschlüsselung verwendet.
echo.
echo Hinweis: Das Passwort wird nicht angezeigt während Sie eingeben.
echo.

REM Generiere zufälliges Secret Key wenn User einfach Enter drückt
set "SECRET_KEY="
set /p SECRET_KEY="SECRET_KEY (oder Enter für Auto-Generierung): "

REM Falls leer, generiere Zufallswert
if "!SECRET_KEY!"=="" (
    REM Generiere Zufallswert aus Timestamp und Random
    for /f "tokens=1-4 delims=/-" %%a in ('date /t') do (set mydate=%%c%%a%%b)
    for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
    set SECRET_KEY=prod-!mydate!-!mytime!-%RANDOM%%RANDOM%
    echo [INFO] Auto-generiertes SECRET_KEY: !SECRET_KEY!
)

REM Aktualisiere .env Datei mit neuem SECRET_KEY
echo [INFO] Aktualisiere .env Datei...
setlocal disableDelayedExpansion
for /f "delims=" %%a in (.env) do (
    set "line=%%a"
    setlocal enableDelayedExpansion
    if "!line:~0,10!"=="SECRET_KEY" (
        echo SECRET_KEY=!SECRET_KEY!
    ) else (
        echo !line!
    )
    endlocal
) > .env.tmp
move /y .env.tmp .env >nul
endlocal enableDelayedExpansion

echo [OK] SECRET_KEY konfiguriert
echo.

goto :eof

REM ============================================================================
REM Funktion: Von Git herunterladen
REM ============================================================================
:download_from_git
echo.
echo [SCHRITT 1] Lade docker-compose.yml und .env von GitHub herunter...

REM Prüfe ob Git installiert ist
git --version >nul 2>&1
if errorlevel 1 (
    echo [INFO] Git nicht gefunden - nutze alternative Download-Methode
    call :download_without_git
    goto :eof
)

REM Klone Repository
if exist ".git" (
    echo [INFO] Git Repository existiert schon - pulfe aktuelle Version
    call git pull origin main
    if errorlevel 1 (
        echo [ERROR] Git pull fehlgeschlagen
        pause
        exit /b 1
    )
) else (
    echo [INFO] Klone Repository von GitHub
    call git clone https://github.com/bimberle/contracts.git .
    if errorlevel 1 (
        echo [ERROR] Git clone fehlgeschlagen
        pause
        exit /b 1
    )
)

echo [OK] Dateien heruntergeladen
echo.
echo [SCHRITT 2] Konfiguriere Environment-Datei...

if not exist ".env" (
    echo [INFO] .env nicht gefunden - erstelle mit Standard-Werten
    call :create_env_file
)

echo [OK] .env konfiguriert
echo.
echo [SCHRITT 3] Starte Docker Container...
call :start_containers

goto :eof

REM ============================================================================
REM Funktion: Download ohne Git (PowerShell Fallback)
REM ============================================================================
:download_without_git
echo.
echo [INFO] Nutze PowerShell zum Download...

REM Lade docker-compose.yml
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/bimberle/contracts/main/docker-compose.yml' -OutFile 'docker-compose.yml'; Write-Host '[OK] docker-compose.yml heruntergeladen' } catch { Write-Host '[ERROR] Download fehlgeschlagen'; exit 1 }" || (
    echo [ERROR] PowerShell Download fehlgeschlagen
    pause
    exit /b 1
)

REM Lade .env.example und benenne um
powershell -Command "try { Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/bimberle/contracts/main/.env.example' -OutFile '.env'; Write-Host '[OK] .env heruntergeladen' } catch { Write-Host '[WARNING] .env.example nicht gefunden, erstelle neue'; }" 

REM Erstelle .env falls nicht vorhanden
if not exist ".env" (
    call :create_env_file
)

goto :eof

REM ============================================================================
REM Funktion: Update existierende Installation
REM ============================================================================
:update_existing
echo.
echo [SCHRITT 1] Ziehe neueste Docker Images
docker-compose pull
if errorlevel 1 (
    echo [ERROR] Docker pull fehlgeschlagen
    pause
    exit /b 1
)

echo [OK] Images aktualisiert
echo.
echo [SCHRITT 2] Stoppe und starte Container neu
docker-compose down
if errorlevel 1 (
    echo [WARNING] Fehler beim Stoppen der Container
)

call :start_containers

goto :eof

REM ============================================================================
REM Funktion: Starte Container
REM ============================================================================
:start_containers
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Docker Compose Start fehlgeschlagen
    pause
    exit /b 1
)

echo [OK] Container gestartet
echo.
echo [INFO] Warte bis alle Services bereit sind (30 Sekunden)...
timeout /t 30 /nobreak

REM Prüfe ob Backend läuft
echo [INFO] Prüfe Backend Health...
for /L %%i in (1,1,10) do (
    curl -s http://localhost:8000/docs >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Backend erreichbar
        goto :backend_ok
    )
    echo [INFO] Versuch %%i/10 - warte 5 Sekunden...
    timeout /t 5 /nobreak
)

echo [WARNING] Backend nicht erreichbar - aber Container laufen
echo Prüfe mit: docker-compose logs backend

:backend_ok
goto :eof

REM ============================================================================
REM Funktion: Erstelle .env Datei
REM ============================================================================
:create_env_file
echo [INFO] Erstelle .env mit Standard-Werten...

(
    echo # Database
    echo POSTGRES_DB=contracts
    echo POSTGRES_USER=contracts_user
    echo POSTGRES_PASSWORD=contracts_password
    echo.
    echo # Backend
    echo DATABASE_URL=postgresql://contracts_user:contracts_password@database:5432/contracts
    echo SECRET_KEY=your-secret-key-change-in-production
    echo DEBUG=True
    echo CORS_ORIGINS_STR=http://localhost:3000,http://localhost,http://localhost:80
    echo AUTH_PASSWORD=
    echo.
    echo # Frontend
    echo VITE_API_URL=/api
) > .env

echo [OK] .env erstellt
goto :eof
