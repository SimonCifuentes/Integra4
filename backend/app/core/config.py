# app/core/config.py
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # DB
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h por defecto

    # CORS
    CORS_ORIGINS: List[str] = []

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
