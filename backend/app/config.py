"""Application configuration using Pydantic settings."""

from functools import lru_cache
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    database_url: str
    
    # Guesty API
    guesty_client_id: str = ""
    guesty_client_secret: str = ""
    guesty_base_url: str = "https://open-api.guesty.com/v1"
    guesty_token_url: str = "https://open-api.guesty.com/oauth2/token"
    
    # Sync Configuration
    sync_lookback_years: int = 3
    sync_cron_schedule: str = "0 3 * * *"
    
    # API Configuration
    api_port: int = 8000
    api_host: str = "0.0.0.0"
    cors_origins: list[str] = []
    
    # Environment
    environment: str = "development"
    debug: bool = True
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def split_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
