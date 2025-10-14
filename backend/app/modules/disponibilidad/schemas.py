from datetime import date, datetime
from pydantic import BaseModel, Field, conint
from typing import Optional

class SlotOut(BaseModel):
    inicio: datetime
    fin: datetime
    etiqueta: str
    precio: Optional[float] = None

class DisponibilidadQuery(BaseModel):
    id_cancha: int = Field(..., ge=1)
    fecha: Optional[date] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    slot_minutos: conint(ge=15, le=240) = 60
