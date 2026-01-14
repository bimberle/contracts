"""
Authentication routes
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.config import settings

router = APIRouter(tags=["auth"])

class LoginRequest(BaseModel):
    password: str

class LoginResponse(BaseModel):
    token: str
    message: str

@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """
    Simple password-based login.
    Returns a token that should be passed as Authorization header.
    """
    # If no password is configured, deny login
    if not settings.AUTH_PASSWORD:
        raise HTTPException(
            status_code=403,
            detail="Authentication is not enabled on this server"
        )
    
    # Check password
    if request.password != settings.AUTH_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid password"
        )
    
    return LoginResponse(
        token=request.password,
        message="Login successful"
    )

@router.get("/auth/check")
async def check_auth():
    """
    Check if authentication is enabled.
    Returns whether authentication is required.
    """
    return {
        "auth_required": settings.AUTH_PASSWORD is not None
    }
