from datetime import datetime
from typing import Optional, Literal, Annotated
from pydantic import BaseModel, Field

# Tipo reutilizable con validación 1..5
Calificacion = Annotated[int, Field(ge=1, le=5)]

# ===== In =====
class ResenaCreateIn(BaseModel):
    id_cancha: Optional[int] = None
    id_complejo: Optional[int] = None
    calificacion: Calificacion
    comentario: Optional[str] = None

class ResenaUpdateIn(BaseModel):
    calificacion: Optional[Calificacion] = None
    comentario: Optional[str] = None

class ReporteIn(BaseModel):
    motivo: Optional[str] = Field(default=None, max_length=2000)  # ojo: max_length

# ===== Out =====
class ResenaOut(BaseModel):
    id_resena: int
    id_usuario: int
    id_cancha: Optional[int]
    id_complejo: Optional[int]
    calificacion: int
    comentario: Optional[str]
    esta_activa: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    promedio_rating: Optional[float] = None
    total_resenas: Optional[int] = None


class ReporteOut(BaseModel):
    id_reporte: int
    id_resena: int
    id_reportante: int
    motivo: Optional[str]
    created_at: datetime

# ===== Query params list =====
OrderType = Literal["recientes", "mejor", "peor"]


class PromedioCanchaOut(BaseModel):
    id_cancha: int = Field(..., description="ID de la cancha")
    promedio: float = Field(
        ..., 
        description="Promedio de calificación entre 1 y 5 (0 si no tiene reseñas)"
    )
    total_resenas: int = Field(
        ..., 
        description="Cantidad de reseñas activas consideradas en el promedio"
    )
