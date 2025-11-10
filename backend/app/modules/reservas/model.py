# app/modules/reservas/models.py
from __future__ import annotations
from datetime import datetime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, String, Numeric, Text, TIMESTAMP, text, func, DateTime
from app.db.base_class import Base

class Reserva(Base):
    __tablename__ = "reservas"

    id_reserva: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    id_cancha:  Mapped[int] = mapped_column(BigInteger, nullable=False)
    id_usuario: Mapped[int] = mapped_column(BigInteger, nullable=False)

    # 👇 Guardamos "aware" con zona, mapeado a TIMESTAMPTZ
    # (Puedes usar DateTime(timezone=True) o TIMESTAMP(timezone=True); ambos mapean a timestamptz)
    inicio: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    fin:    Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)

    estado:       Mapped[str]        = mapped_column(String(20), default="pendiente", nullable=False)
    precio_total: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    notas:        Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=func.now()
    )

    __mapper_args__ = {"eager_defaults": True}
