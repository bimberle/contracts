"""
System router for version checking and updates.
"""
from fastapi import APIRouter, HTTPException
import httpx
import subprocess
import os
import asyncio
from typing import Optional

router = APIRouter(prefix="/api/system", tags=["system"])

def get_current_version() -> str:
    """Get the current backend version from main module."""
    try:
        from app.main import BACKEND_VERSION
        return BACKEND_VERSION
    except ImportError:
        return "unknown"

async def get_docker_hub_digest(image: str, tag: str = "latest") -> Optional[str]:
    """
    Get the digest of an image from Docker Hub.
    Returns None if unable to fetch.
    """
    try:
        # Docker Hub API v2 - get manifest
        url = f"https://hub.docker.com/v2/repositories/{image}/tags/{tag}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                return data.get("digest") or data.get("images", [{}])[0].get("digest")
    except Exception as e:
        print(f"Error fetching Docker Hub digest: {e}")
    return None


async def get_local_image_digest(image: str) -> Optional[str]:
    """
    Get the digest of a locally running image.
    Returns None if unable to fetch.
    """
    try:
        # Use docker inspect to get the image digest
        result = subprocess.run(
            ["docker", "inspect", "--format", "{{index .RepoDigests 0}}", image],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            # Format: image@sha256:...
            digest_str = result.stdout.strip()
            if "@" in digest_str:
                return digest_str.split("@")[1]
    except Exception as e:
        print(f"Error getting local image digest: {e}")
    return None


@router.get("/version-check")
async def check_for_updates():
    """
    Check if a newer version is available on Docker Hub.
    Compares the digest of the running image with Docker Hub.
    """
    try:
        # Check both frontend and backend images
        images = [
            "bimberle/contracts-backend",
            "bimberle/contracts-frontend"
        ]
        
        updates_available = False
        details = []
        
        for image in images:
            hub_digest = await get_docker_hub_digest(image)
            local_digest = await get_local_image_digest(f"{image}:latest")
            
            image_update_available = False
            if hub_digest and local_digest:
                image_update_available = hub_digest != local_digest
                if image_update_available:
                    updates_available = True
            
            details.append({
                "image": image,
                "local_digest": local_digest[:20] + "..." if local_digest else None,
                "hub_digest": hub_digest[:20] + "..." if hub_digest else None,
                "update_available": image_update_available
            })
        
        return {
            "current_version": get_current_version(),
            "update_available": updates_available,
            "details": details
        }
    except Exception as e:
        return {
            "current_version": get_current_version(),
            "update_available": False,
            "error": str(e)
        }


@router.post("/update")
async def trigger_update():
    """
    Trigger an update by pulling new images and recreating containers.
    Uses direct Docker commands instead of docker-compose.
    """
    try:
        # Check if we have access to docker
        result = subprocess.run(
            ["docker", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail="Docker is not available. Make sure the Docker socket is mounted."
            )
        
        # Create update script that will run in background
        # Uses direct Docker commands to pull and recreate containers
        update_script = """#!/bin/bash
exec > /tmp/update_log.txt 2>&1
echo "=== Update started at $(date) ==="

# Wait a moment for the API response to be sent
sleep 2

echo "Pulling new backend image..."
docker pull bimberle/contracts-backend:latest

echo "Pulling new frontend image..."
docker pull bimberle/contracts-frontend:latest

echo "Stopping and removing old frontend..."
docker stop contracts_frontend || true
docker rm contracts_frontend || true

echo "Starting new frontend..."
docker run -d \\
    --name contracts_frontend \\
    --network contracts_network \\
    -p 80:80 \\
    --restart unless-stopped \\
    bimberle/contracts-frontend:latest

echo "Stopping and removing old backend..."
docker stop contracts_backend || true
docker rm contracts_backend || true

echo "Starting new backend..."
docker run -d \\
    --name contracts_backend \\
    --network contracts_network \\
    -p 8000:8000 \\
    -e DATABASE_URL=postgresql://contracts_user:contracts_password@contracts_db:5432/contracts \\
    -e SECRET_KEY=change-this-in-production \\
    -e DEBUG=False \\
    -e CORS_ORIGINS_STR=http://localhost:3000,http://localhost,http://localhost:80 \\
    -v /var/run/docker.sock:/var/run/docker.sock \\
    --restart unless-stopped \\
    bimberle/contracts-backend:latest

echo "=== Update completed at $(date) ==="
"""
        
        # Write and execute the update script
        script_path = "/tmp/update_containers.sh"
        with open(script_path, "w") as f:
            f.write(update_script)
        
        os.chmod(script_path, 0o755)
        
        # Run the script in background (nohup)
        subprocess.Popen(
            ["nohup", "bash", script_path],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True
        )
        
        return {
            "status": "update_started",
            "message": "Update wird durchgeführt. Die Container werden neu gestartet.",
            "expected_version": "latest"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start update: {str(e)}"
        )
