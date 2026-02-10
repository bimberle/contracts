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
    This endpoint will start the update process and return immediately.
    The containers will be recreated in the background.
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
        
        # Determine the compose file location
        # In production, compose file is usually in /app or a mounted volume
        compose_paths = [
            "/app/docker-compose.prod.yml",
            "/app/docker-compose.yml",
            "/docker-compose.prod.yml",
            "/docker-compose.yml",
            "./docker-compose.prod.yml",
            "./docker-compose.yml",
        ]
        
        compose_file = None
        for path in compose_paths:
            if os.path.exists(path):
                compose_file = path
                break
        
        # If no compose file found, try to use docker-compose without -f flag
        # This relies on the COMPOSE_FILE environment variable or default location
        
        # Create update script that will run in background
        update_script = """#!/bin/bash
# Wait a moment for the API response to be sent
sleep 2

# Pull new images
docker-compose pull 2>&1 || docker compose pull 2>&1

# Recreate containers with new images
docker-compose up -d 2>&1 || docker compose up -d 2>&1
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
            "message": "Update process started. The application will restart shortly. Please refresh the page in about 30 seconds."
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start update: {str(e)}"
        )
