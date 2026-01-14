@echo off
REM Update script for Contracts Webapp on Windows
setlocal enabledelayedexpansion

cls
echo.
echo Contract Management Webapp - Update to latest version
echo.

REM Check Docker
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker not found
    pause
    exit /b 1
)

REM Check git
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git not found
    pause
    exit /b 1
)

echo Step 1: Updating Git repository...
git pull origin main
if errorlevel 1 (
    echo ERROR: Git pull failed
    pause
    exit /b 1
)
echo OK: Git updated
echo.

REM Ask about data
echo Step 2: Database Management
echo.
echo Should database data be deleted?
echo Y = DELETE all data (fresh start, for schema issues)
echo N = KEEP data (normal update)
echo.
set /p deletedata="Delete data? (Y/N, default N): "
if "%deletedata%"=="" set deletedata=N

REM Stop containers
echo.
echo Stopping containers...
docker-compose down >nul 2>&1

if /i "%deletedata%"=="Y" (
    echo Deleting database...
    docker volume rm contracts_postgres_data >nul 2>&1
)

echo.
echo Step 3: Pulling new images...
docker-compose pull
if errorlevel 1 (
    echo ERROR: Docker pull failed
    pause
    exit /b 1
)

echo.
echo Step 4: Starting containers...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Docker up failed
    pause
    exit /b 1
)

echo Waiting for database to initialize...
timeout /t 60 /nobreak

REM Run migrations if data was deleted
if /i "%deletedata%"=="Y" (
    echo.
    echo Step 5: Running migrations...
    docker-compose exec -T backend alembic upgrade head
)

echo.
echo SUCCESS: Update completed!
echo.
echo Available at:
echo - http://localhost (Frontend)
echo - http://localhost/api/docs (API documentation)
echo.
pause
