from __future__ import annotations
from datetime import date, time
from pydantic import BaseModel, Field

class ReservaCreateIn(BaseModel):
    id_cancha: int = Field(..., gt=0)
    fecha_reserva: date
    hora_inicio: time
    hora_fin: time

class ReservaOut(BaseModel):
    id_reserva: int
    id_usuario: int
    id_cancha: int
    fecha_reserva: date
    hora_inicio: str  # "HH:MM"
    hora_fin: str     # "HH:MM"
    estado: str       # "pending" | "confirmed" | "cancelled"
    monto_total: float | None = None
