# app/modules/reservas/schemas.py
from datetime import datetime, date, time
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, validator

EstadoReserva = Literal["pendiente", "confirmada", "cancelada", "expirada"]

class ReservaBase(BaseModel):
    id_cancha: int = Field(..., gt=0, description="ID de la cancha")
    fecha: date = Field(..., description="Fecha local (America/Santiago)")
    inicio: time = Field(..., description="Hora inicio local HH:MM")
    fin: time = Field(..., description="Hora fin local HH:MM")
    notas: Optional[str] = Field(None, max_length=500)

    @validator("fin")
    def validar_horas(cls, v, values):
        if "inicio" in values and v <= values["inicio"]:
            raise ValueError("La hora fin debe ser mayor a la hora inicio")
        return v

class ReservaCreateIn(ReservaBase):
    """
    Crear reserva. Convierte fecha+horas a timestamptz (America/Santiago) en el Service.
    """
    class Config:
        json_schema_extra = {
            "example": {
                "id_cancha": 1,
                "fecha": "2025-10-21",
                "inicio": "19:00",
                "fin": "20:30",
                "notas": "Partido amistoso"
            }
        }

class ReservaPatchIn(BaseModel):
    """ Reprogramar: permite cambiar horas y notas. """
    fecha: Optional[date] = None
    inicio: Optional[time] = None
    fin: Optional[time] = None
    notas: Optional[str] = Field(None, max_length=500)

    @validator("fin")
    def validar_horas_patch(cls, v, values):
        # Solo valida si también llega inicio
        if v and values.get("inicio") and v <= values["inicio"]:
            raise ValueError("La hora fin debe ser mayor a la hora inicio")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "fecha": "2025-10-22",
                "inicio": "20:00",
                "fin": "21:00",
                "notas": "Reprogramado por lluvia"
            }
        }

class ReservaOut(BaseModel):
    id_reserva: int
    id_usuario: int
    id_cancha: int
    fecha_reserva: date
    hora_inicio: str
    hora_fin: str
    estado: EstadoReserva
    precio_total: Optional[float] = None
    notas: Optional[str] = None

class QuoteIn(ReservaBase):
    cupon: Optional[str] = Field(None, description="Código promocional (si aplica)")
    class Config:
        json_schema_extra = {
            "example": {
                "id_cancha": 1,
                "fecha": "2025-10-21",
                "inicio": "19:00",
                "fin": "20:30",
                "cupon": "OCT-10"
            }
        }

class QuoteOut(BaseModel):
    moneda: str = "CLP"
    subtotal: float
    descuento: float
    total: float
    detalle: Optional[str] = None
