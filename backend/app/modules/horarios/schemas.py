from pydantic import BaseModel, Field
from typing import Optional
from datetime import time

_DIAS = "^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)$"

class HorarioBase(BaseModel):
    id_complejo: int = Field(..., ge=1)
    id_cancha: Optional[int] = Field(None, ge=1)  # null => horario general del complejo
    dia: str = Field(..., pattern=_DIAS)          # <-- se llama 'dia'
    hora_apertura: time
    hora_cierre: time

class HorarioCreate(HorarioBase): pass

class HorarioPatch(BaseModel):
    dia: Optional[str] = Field(None, pattern=_DIAS)
    hora_apertura: Optional[time] = None
    hora_cierre: Optional[time] = None
