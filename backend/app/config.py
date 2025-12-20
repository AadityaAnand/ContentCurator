from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )
    # Database
    DATABASE_URL: str = "postgresql+psycopg://aadityaanand@localhost:5432/content_curator"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Ollama
    OLLAMA_HOST: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"
    OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"

    # Search APIs
    TAVILY_API_KEY: Optional[str] = None
    YOUTUBE_API_KEY: Optional[str] = None

    # Security
    SECRET_KEY: str = "dev_secret_key_change_in_production"
    JWT_SECRET_KEY: str = "jwt_dev_secret_key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7
    
    # Application
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api"
    PROJECT_NAME: str = "Content Curator"
    
    # Email (for Phase 3)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM: Optional[str] = None
    
    # Pagination
    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100
    
    # Cache TTL (seconds)
    CACHE_TTL_SHORT: int = 300  # 5 minutes
    CACHE_TTL_MEDIUM: int = 3600  # 1 hour
    CACHE_TTL_LONG: int = 86400  # 24 hours
    
settings = Settings()
