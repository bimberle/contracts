from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str = "your-secret-key-change-in-production"
    DEBUG: bool = True
    CORS_ORIGINS_STR: str = "http://localhost:3000"
    AUTH_PASSWORD: Optional[str] = None  # Optional password for API authentication
    
    class Config:
        env_file = ".env"
        case_sensitive = True
    
    def __init__(self, **data):
        super().__init__(**data)
        # Convert empty string to None for AUTH_PASSWORD
        if self.AUTH_PASSWORD == "":
            self.AUTH_PASSWORD = None
    
    @property
    def CORS_ORIGINS(self) -> List[str]:
        """Parse CORS_ORIGINS from comma-separated string"""
        return [origin.strip() for origin in self.CORS_ORIGINS_STR.split(",")]

settings = Settings()
