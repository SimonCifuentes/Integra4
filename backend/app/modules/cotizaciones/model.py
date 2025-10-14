from __future__ import annotations
from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, Text, JSON
from sqlalchemy.orm import relationship, Mapped, mapped_column
from app.db.base_class import Base  # ajusta si tu Base está en otro path

class Cotizacion(Base):
    __tablename__ = "cotizaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)  # ej: "SportHub Temuco - Sprint 2"
    cliente: Mapped[Optional[str]] = mapped_column(String(120))
    moneda: Mapped[str] = mapped_column(String(10), default="CLP")
    notas: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # totales cacheados (se recalculan al actualizar items)
    total_horas: Mapped[float] = mapped_column(Float, default=0.0)
    total_monto: Mapped[float] = mapped_column(Float, default=0.0)

    # estructura libre de paquetes para mostrar (no crítico para cálculos)
    paquetes_meta: Mapped[Optional[dict]] = mapped_column(JSON)  # {"paquetes":[{"nombre":"...","orden":0}]}

    items: Mapped[List["CotizacionItem"]] = relationship(
        "CotizacionItem", back_populates="cotizacion", cascade="all, delete-orphan"
    )

class CotizacionItem(Base):
    __tablename__ = "cotizacion_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cotizacion_id: Mapped[int] = mapped_column(ForeignKey("cotizaciones.id", ondelete="CASCADE"), index=True)
    paquete: Mapped[str] = mapped_column(String(120))  # ej: "1. Endurecimiento Backend"
    rol: Mapped[str] = mapped_column(String(80))       # ej: "Backend Senior (FastAPI)"
    horas: Mapped[float] = mapped_column(Float, default=0.0)
    tarifa_hora: Mapped[float] = mapped_column(Float, default=0.0)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)

    descripcion: Mapped[Optional[str]] = mapped_column(Text)

    cotizacion: Mapped[Cotizacion] = relationship("Cotizacion", back_populates="items")
