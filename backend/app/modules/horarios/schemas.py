# app/modules/horarios/schemas.py
from __future__ import annotations

from datetime import time
from typing import Optional

from pydantic import BaseModel, Field

# Aceptamos solo estos días
_DIAS_REGEX = r"^(lunes|martes|miercoles|jueves|viernes|sabado|domingo)$"


class HorarioBase(BaseModel):
    id_complejo: int = Field(..., ge=1, description="ID del complejo")
    id_cancha: Optional[int] = Field(
        None,
        ge=1,
        description="ID de la cancha. Si es null => horario general del complejo."
    )
    dia: str = Field(
        ...,
        pattern=_DIAS_REGEX,
        description="Día de la semana en minúsculas (lunes..domingo)."
    )
    hora_apertura: time = Field(..., description="Hora de apertura (HH:MM:SS)")
    hora_cierre: time = Field(..., description="Hora de cierre (HH:MM:SS)")


class HorarioCreate(HorarioBase):
    """Payload para crear un horario de atención."""
    pass


class HorarioPatch(BaseModel):
    """Payload para actualizar parcialmente un horario."""
    dia: Optional[str] = Field(
        None,
        pattern=_DIAS_REGEX,
        description="Nuevo día de la semana."
    )
    hora_apertura: Optional[time] = Field(
        None,
        description="Nueva hora de apertura."
    )
    hora_cierre: Optional[time] = Field(
        None,
        description="Nueva hora de cierre."
    )


class HorarioOut(HorarioBase):
    """Representación de un horario tal como se devuelve en las respuestas."""
    id_horario: int = Field(..., ge=1, description="ID del horario de atención")
