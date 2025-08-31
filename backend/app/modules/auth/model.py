from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, Boolean, TIMESTAMP, text, func  # <-- añade text, func
from app.db.base_class import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    nombre: Mapped[Optional[str]] = mapped_column(String(120))
    apellido: Mapped[Optional[str]] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(160), unique=True)
    telefono: Mapped[Optional[str]] = mapped_column(String(30))
    hashed_password: Mapped[str] = mapped_column(String)
    rol: Mapped[str] = mapped_column(String(20), default="usuario")
    esta_activo: Mapped[bool] = mapped_column(Boolean, default=True)
    verificado: Mapped[bool] = mapped_column(Boolean, default=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512))
    google_id: Mapped[Optional[str]] = mapped_column(String(120))

    # 👇 clave: deja que Postgres ponga now() y actualice updated_at
    created_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
    )
    updated_at: Mapped[str] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=False,
        server_default=text("now()"),
        onupdate=func.now(),
    )

    # (opcional) para que SQLAlchemy recupere defaults del servidor
    __mapper_args__ = {"eager_defaults": True}
