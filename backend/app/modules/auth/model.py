# app/modules/auth/model.py
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, Boolean, TIMESTAMP, Integer, text, func
from app.db.base_class import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(120))
    apellido: Mapped[Optional[str]] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True, index=True, nullable=False)
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    rol: Mapped[str] = mapped_column(String(20), default="usuario", nullable=False)
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    verificado: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    google_id: Mapped[Optional[str]] = mapped_column(String(120))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("now()"),
        onupdate=func.now(), nullable=False
    )

    # Aceptaciones / borrado lógico
    terms_accepted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    privacy_accepted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    deleted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))

    # --- Verificación de correo ---
    verification_code: Mapped[Optional[str]] = mapped_column(String(12))
    verification_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    verification_attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"), default=0, nullable=False)
    verification_last_sent: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))

    # --- Reset de contraseña ---
    reset_code: Mapped[Optional[str]] = mapped_column(String(12))
    reset_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    reset_attempts: Mapped[int] = mapped_column(Integer, server_default=text("0"), default=0, nullable=False)
    reset_last_sent: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))

    __mapper_args__ = {"eager_defaults": True}
