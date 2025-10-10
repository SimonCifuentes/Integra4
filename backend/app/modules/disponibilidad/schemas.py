from __future__ import annotations
from datetime import date
from pydantic import BaseModel, Field
from typing import List

class Slot(BaseModel):
    inicio: str = Field(..., description="Hora de inicio en formato HH:MM")
    fin: str = Field(..., description="Hora de fin en formato HH:MM")

class DisponibilidadOut(BaseModel):
    id_cancha: int
    fecha: date
    slot_min: int
    slots: List[Slot]  # Se usa List en lugar de list para mayor claridad

