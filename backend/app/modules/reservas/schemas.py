from __future__ import annotations
from datetime import date, time
from typing import Optional
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

# ===== NUEVO: body opcional para cancelar (motivo libre, no persistido aún) =====
class CancelReservaIn(BaseModel):
    motivo: Optional[str] = Field(
        default=None,
        max_length=280,
        description="Motivo de la cancelación (opcional, máx. 280 caracteres)"
    )

# === Disponibilidad de canchas ===

class CanchaDisponibleOut(BaseModel):
    id_cancha: int = Field(..., gt=0)

class SlotOut(BaseModel):
    fecha: date
    hora_inicio: str  # "HH:MM"
    hora_fin: str     # "HH:MM"

class SlotsCanchaOut(BaseModel):
    id_cancha: int
    fecha: date
    slots: list[SlotOut]

# ===== Cotización de reserva (quote) =====

class QuoteIn(BaseModel):
    """
    Solicitud de cotización sin crear la reserva.
    Calcula precio segmentando por reglas vigentes para la fecha y franja indicada.
    """
    id_cancha: int = Field(..., gt=0)
    fecha: date
    hora_inicio: time
    hora_fin: time

class SegmentoOut(BaseModel):
    """
    Tramo de precio aplicado dentro de la franja solicitada.
    'precio_por_hora' se interpreta como NETO o BRUTO según settings.PRECIOS_INCLUYEN_IVA.
    """
    desde: str              # "HH:MM"
    hasta: str              # "HH:MM"
    minutos: int
    precio_por_hora: float
    subtotal_neto: float

class QuoteOut(BaseModel):
    """
    Resultado de cotización.
    - neto: suma de subtotales sin IVA (o neteado si los precios vienen con IVA incluido)
    - iva: monto de IVA aplicado (según IVA_PERCENT)
    - total: monto final (CLP, redondeado a entero)
    """
    id_cancha: int
    fecha: date
    hora_inicio: str        # "HH:MM"
    hora_fin: str           # "HH:MM"
    minutos_totales: int
    neto: float
    iva: float
    total: float
    moneda: str = "CLP"
    segmentos: list[SegmentoOut]
