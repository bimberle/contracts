"""
Authentication module for the Contract Management API
Supports simple password-based authentication via environment variable
"""

from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from typing import Optional
from app.config import settings
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

async def verify_auth(credentials: Optional[HTTPAuthCredentials] = Depends(security)) -> str:
    """
    Verify authentication token.
    If AUTH_PASSWORD is set in environment, requires valid token.
    Token format: "Bearer <password>"
    """
    # If no password is configured, allow all requests
    if not settings.AUTH_PASSWORD:
        return "anonymous"
    
    # If password is configured, credentials are required
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Provide token in Authorization header."
        )
    
    # Verify the token (simple string comparison)
    if credentials.credentials != settings.AUTH_PASSWORD:
        raise HTTPException(
            status_code=403,
            detail="Invalid authentication token"
        )
    
    return "authenticated"
