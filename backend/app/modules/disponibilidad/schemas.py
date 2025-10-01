from __future__ import annotations
from datetime import date
from pydantic import BaseModel, Field

class Slot(BaseModel):
    inicio: str = Field(..., description="HH:MM")
    fin: str = Field(..., description="HH:MM")

class DisponibilidadOut(BaseModel):
    id_cancha: int
    fecha: date
    slot_min: int
    slots: list[Slot]