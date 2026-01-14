# Contracts Application Update Script (PowerShell)
# For Windows systems where batch files have encoding issues

param(
    [switch]$DeleteData = $false
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================================"
Write-Host "Contracts Application - Update Script (PowerShell)"
Write-Host "============================================================================"
Write-Host ""

# Check requirements
try {
    docker --version | Out-Null
    Write-Host "OK: Docker found"
} catch {
    Write-Host "ERROR: Docker is not installed or not in PATH"
    Write-Host "Please install Docker Desktop: https://www.docker.com/products/docker-desktop"
    exit 1
}

try {
    docker-compose --version | Out-Null
    Write-Host "OK: Docker Compose found"
} catch {
    Write-Host "ERROR: Docker Compose is not installed"
    exit 1
}

try {
    git --version | Out-Null
    Write-Host "OK: Git found"
} catch {
    Write-Host "ERROR: Git is not installed"
    exit 1
}

Write-Host ""
Write-Host "Step 1: Updating from GitHub..."
Write-Host ""

git pull origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Git pull failed"
    exit 1
}

Write-Host "OK: Repository updated"
Write-Host ""

# Ask about database if not specified in parameters
if (-not $DeleteData) {
    Write-Host "Step 2: Database Management"
    Write-Host ""
    Write-Host "Should database data be deleted?"
    Write-Host ""
    Write-Host "  Y = DELETE everything (fresh start, fixes schema issues)"
    Write-Host "  N = KEEP data (normal update)"
    Write-Host ""
    
    $response = Read-Host "Delete data? (Y/N, default N)"
    if ($response -eq "Y" -or $response -eq "y") {
        $DeleteData = $true
    }
}

Write-Host ""
Write-Host "Stopping containers..."
docker-compose down | Out-Null

if ($DeleteData) {
    Write-Host "Deleting all data..."
    docker volume rm contracts_postgres_data -f | Out-Null
    Write-Host "OK: Database deleted"
    Write-Host ""
}

Write-Host "Step 3: Pulling new Docker images..."
Write-Host ""
docker-compose pull
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to pull images"
    exit 1
}
Write-Host "OK: Images updated"
Write-Host ""

Write-Host "Step 4: Starting application..."
Write-Host ""
docker-compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to start containers"
    exit 1
}
Write-Host "OK: Containers started"
Write-Host ""

Write-Host "Step 5: Initializing database..."
Write-Host "Waiting 30 seconds for database startup..."
Write-Host ""
Start-Sleep -Seconds 30

if ($DeleteData) {
    Write-Host ""
    Write-Host "Running migrations..."
    docker-compose exec -T backend alembic upgrade head
    if ($LASTEXITCODE -ne 0) {
        Write-Host "WARNING: Migrations may have issues"
        Write-Host "You can manually run: docker-compose exec backend alembic upgrade head"
    } else {
        Write-Host "OK: Migrations completed"
    }
}

Write-Host ""
Write-Host "============================================================================"
Write-Host "SUCCESS: Update completed!"
Write-Host "============================================================================"
Write-Host ""
Write-Host "Available at:"
Write-Host "  http://localhost           (Web interface)"
Write-Host "  http://localhost/api/docs  (API documentation)"
Write-Host ""
Write-Host "Check application logs:"
Write-Host "  docker-compose logs -f"
Write-Host ""
