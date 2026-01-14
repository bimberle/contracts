@echo off
REM ============================================================================
REM Contract Management Webapp - Windows Update Script
REM ============================================================================
REM This script:
REM 1. Updates the local Git repository (git pull)
REM 2. Asks if database should be deleted
REM 3. Pulls new Docker images
REM 4. Restarts containers
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================================
echo Contract Management Webapp - Update to latest version
echo ============================================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed or not in PATH
    echo Please install Docker Desktop: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Desktop with Compose
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose found
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed
    echo Please install Git: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo [OK] Git found
echo.

REM ============================================================================
REM 1. Git Pull - neueste Änderungen laden
REM ============================================================================
echo.
echo ============================================================================
echo STEP 1: Update Git repository...
echo ============================================================================
echo.

git pull origin main
if errorlevel 1 (
    echo [ERROR] Git pull failed
    pause
    exit /b 1
)

echo [OK] Git repository updated
echo.

REM ============================================================================
REM 2. Frage nach Datenbank-Löschung
REM ============================================================================
echo.
echo ============================================================================
echo STEP 2: Database Management
echo ============================================================================
echo.
echo WARNING: Should all database data be deleted?
echo.
echo Option 1: [Y]es   - DELETE all data (clean fresh start)
echo           Use this if there are migration or schema issues
echo.
echo Option 2: [N]o    - KEEP data (only update images)
echo           Use this for normal updates
echo.

set /p deletedata="Delete data? (Y/N) [Default: N]: "
if /i "%deletedata%"=="" set "deletedata=N"

setlocal
if /i "%deletedata%"=="Y" (
    setlocal disabledelayedexpansion
    echo.
    echo [INFO] Deleting all containers and database...
    
    docker-compose down -v >nul 2>&1
    
    echo [OK] Containers and database deleted
    echo.
    echo [INFO] Also deleting local Docker volumes...
    docker volume rm contracts_postgres_data >nul 2>&1
    echo [OK] Volumes deleted
    echo.
    set "DELETEDATA=1"
    endlocal
) else (
    echo.
    echo [INFO] Stopping containers only (keeping data)...
    docker-compose down >nul 2>&1
    echo [OK] Containers stopped
    echo.
    set "DELETEDATA=0"
)

REM ============================================================================
REM 3. Neue Images pullen
REM ============================================================================
echo.
echo ============================================================================
echo STEP 3: Loading new Docker images...
echo ============================================================================
echo.

docker-compose pull
if errorlevel 1 (
    echo [ERROR] Docker compose pull failed
    pause
    exit /b 1
)

echo [OK] New images loaded
echo.

REM ============================================================================
REM 4. Container neu starten
REM ============================================================================
echo.
echo ============================================================================
echo STEP 4: Restarting containers...
echo ============================================================================
echo.

docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Docker compose up failed
    pause
    exit /b 1
)

echo [OK] Containers starting...
echo.
echo [INFO] Waiting 60 seconds for database to fully initialize...
timeout /t 60 /nobreak

REM ============================================================================
REM 5. Optional: Run migrations on fresh start
REM ============================================================================
if "%DELETEDATA%"=="1" (
    echo.
    echo ============================================================================
    echo STEP 5: Running database migrations...
    echo ============================================================================
    echo.
    
    docker-compose exec -T backend alembic upgrade head
    if errorlevel 1 (
        echo [WARNING] Migrations may have failed, but not critical
    ) else (
        echo [OK] Migrations executed successfully
    )
    echo.
)

REM ============================================================================
REM Fertig!
REM ============================================================================
echo.
echo ============================================================================
echo [SUCCESS] Update completed!
echo ============================================================================
echo.
echo The webapp is now available at:
echo - Frontend: http://localhost
echo - Backend API: http://localhost/api/
echo - API Docs: http://localhost/api/docs
echo.
echo View logs:
echo   docker-compose logs
echo.
echo Restart containers:
echo   docker-compose down
echo   docker-compose up -d
echo.
echo.
pause
