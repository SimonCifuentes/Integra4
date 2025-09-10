# app/core/config.py  (antes importabas BaseSettings desde pydantic)
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # === App ===
    ENV: str = "development"
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    LOG_LEVEL: str = "info"

    # === CORS ===
    CORS_ORIGINS: str = "http://localhost:19006"

    # === JWT ===
    JWT_SECRET: str = "change_me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    # === DB ===
    DATABASE_URL: str | None = None
    ASYNC_DATABASE_URL: str | None = None

    # === Email (opc) ===
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = 587
    SMTP_USER: str | None = None
    SMTP_PASSWORD: str | None = None
    EMAIL_FROM: str | None = None

    # === Storage (opc) ===
    STORAGE_PROVIDER: str = "local"
    S3_BUCKET: str | None = None
    S3_REGION: str | None = None
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_PUBLIC_BASE_URL: str | None = None

    # === Pydantic v2 settings ===
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # ignora variables no declaradas
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

settings = Settings()
