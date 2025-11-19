from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, field_validator

# Días permitidos según enum dia_semana en la BD
_DIAS_VALIDOS = {
    "lunes",
    "martes",
    "miercoles",
    "miércoles",
    "jueves",
    "viernes",
    "sabado",
    "sábado",
    "domingo",
}


class HorarioBase(BaseModel):
    """
    Datos base de un horario de atención.
    Si id_cancha es None => horario general del complejo.
    """
    id_cancha: Optional[int] = None
    dia_semana: str
    hora_apertura: str  # formato "HH:MM"
    hora_cierre: str    # formato "HH:MM"

    @field_validator("dia_semana")
    @classmethod
    def normalizar_dia(cls, v: str) -> str:
        if not v:
            raise ValueError("dia_semana es obligatorio")
        dia = v.strip().lower()
        if dia not in _DIAS_VALIDOS:
            raise ValueError(
                "dia_semana debe ser uno de: lunes, martes, miercoles, jueves, "
                "viernes, sabado, domingo"
            )
        # normalizamos "miércoles" / "sábado" a versión sin tilde
        if dia == "miércoles":
            return "miercoles"
        if dia == "sábado":
            return "sabado"
        return dia


class HorarioCreateIn(HorarioBase):
    """
    Datos de entrada para crear un horario.
    """
    id_complejo: int


class HorarioUpdateIn(BaseModel):
    """
    Datos de entrada para actualizar un horario.
    Todos los campos son opcionales.
    """
    dia_semana: Optional[str] = None
    hora_apertura: Optional[str] = None
    hora_cierre: Optional[str] = None

    @field_validator("dia_semana")
    @classmethod
    def normalizar_dia(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        dia = v.strip().lower()
        if dia not in _DIAS_VALIDOS:
            raise ValueError(
                "dia_semana debe ser uno de: lunes, martes, miercoles, jueves, "
                "viernes, sabado, domingo"
            )
        if dia == "miércoles":
            return "miercoles"
        if dia == "sábado":
            return "sabado"
        return dia


class HorarioOut(BaseModel):
    """
    Representación del horario que devuelve la API.
    """
    id_horario: int
    id_complejo: int
    id_cancha: Optional[int] = None
    dia_semana: str
    hora_apertura: str
    hora_cierre: str
