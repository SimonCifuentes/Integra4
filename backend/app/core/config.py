# app/core/config.py  (antes importabas BaseSettings desde pydantic)
import os

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
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str | None = os.getenv("SMTP_USER")
    SMTP_PASSWORD: str | None = os.getenv("SMTP_PASSWORD")
    SMTP_FROM_EMAIL: str | None = os.getenv("SMTP_FROM_EMAIL", os.getenv("SMTP_USER"))
    SMTP_FROM_NAME: str = os.getenv("SMTP_FROM_NAME", "SportHub Temuco")
    MAIL_STARTTLS: bool = os.getenv("MAIL_STARTTLS", "True").lower() == "true"
    MAIL_ENABLED: bool = os.getenv("MAIL_ENABLED", "true").lower() == "true"
    MAIL_ECHO: bool = os.getenv("MAIL_ECHO", "false").lower() == "true"

    OTP_EXPIRE_MINUTES: int = int(os.getenv("OTP_EXPIRE_MINUTES", "15"))
    OTP_MAX_ATTEMPTS: int = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
    RESEND_COOLDOWN_SECONDS: int = int(os.getenv("RESEND_COOLDOWN_SECONDS", "60"))
    # === Storage (opc) ===
    STORAGE_PROVIDER: str = "local"
    S3_BUCKET: str | None = None
    S3_REGION: str | None = None
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_PUBLIC_BASE_URL: str | None = None
    REVIEWS_REQUIRE_FINISHED: bool = True  # En prod: True. En dev: False para probar rápido.

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
