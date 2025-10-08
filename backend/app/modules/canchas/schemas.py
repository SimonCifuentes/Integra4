from __future__ import annotations
from typing import Optional, Literal, List, Annotated
from pydantic import BaseModel, Field
from pydantic import AliasChoices  # <-- para alias 'techada' en Query
from datetime import time, date



# Tipos con restricciones (Pydantic v2)
Lat = Annotated[float, Field(ge=-90, le=90)]
Lon = Annotated[float, Field(ge=-180, le=180)]
PositiveKm = Annotated[float, Field(gt=0)]
NonNegMoney = Annotated[float, Field(ge=0)]
Page = Annotated[int, Field(ge=1)]
PageSize = Annotated[int, Field(ge=1, le=100)]

# ====== Entradas ======
class CanchaCreateIn(BaseModel):
    """Crea una cancha dentro de un complejo (solo dueño/admin).

    Puedes enviar `id_deporte` o `deporte` (nombre). Si envías ambos, prevalece `id_deporte`.
    """
    id_complejo: int = Field(..., description="ID del complejo al que pertenece")
    nombre: str = Field(..., min_length=2, max_length=160)
    id_deporte: Optional[int] = Field(None, description="ID del deporte")
    deporte: Optional[str] = Field(None, description="Nombre del deporte (ej: futbol, tenis)")
    cubierta: bool = Field(False, description="¿Es techada/cubierta?")

class CanchaUpdateIn(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=160)
    id_deporte: Optional[int] = None
    deporte: Optional[str] = None
    cubierta: Optional[bool] = None
    activo: Optional[bool] = None

class CanchasQuery(BaseModel):
    q: Optional[str] = Field(None, description="Texto libre en nombre de cancha")
    id_complejo: Optional[int] = Field(None, description="Filtra por complejo")
    deporte: Optional[str] = Field(None, description="Nombre del deporte")
    # Acepta 'cubierta' o 'techada' como nombre de parámetro
    cubierta: Optional[bool] = Field(
        default=None,
        description="Solo techadas/no techadas (alias: techada)",
        validation_alias=AliasChoices("cubierta", "techada"),
    )
    iluminacion: Optional[bool] = Field(
        default=None,
        description="Solo con/sin iluminación (requiere columna canchas.iluminacion)",
    )
    max_precio: Optional[NonNegMoney] = Field(None, description="Precio por hora máximo (regla vigente mínima)")
    lat: Optional[Lat] = None
    lon: Optional[Lon] = None
    max_km: Optional[PositiveKm] = Field(None, description="Radio máximo en km (requiere lat/lon)")
    sort_by: Optional[Literal["distancia","precio","rating","nombre","recientes"]] = "nombre"
    order: Optional[Literal["asc","desc"]] = "asc"
    page: Page = 1
    page_size: PageSize = 20

# ====== Salidas ======
class CanchaOut(BaseModel):
    id_cancha: int
    id_complejo: int
    nombre: str
    deporte: str
    cubierta: bool
    activo: bool
    precio_desde: Optional[float] = Field(None, description="Regla de precio vigente mínima")
    rating_promedio: Optional[float] = Field(None, description="Promedio 1..5 (solo reseñas activas)")
    total_resenas: int = 0
    distancia_km: Optional[float] = Field(None, description="Si se envió lat/lon")

class CanchasListOut(BaseModel):
    items: List[CanchaOut]
    total: int
    page: int
    page_size: int

class CanchaFotoIn(BaseModel):
    url_foto: str = Field(..., max_length=512, description="URL absoluta de la imagen")
    orden: Optional[int] = Field(None, ge=1, description="Orden opcional; si no, se autoincrementa")

class CanchaFotoOut(BaseModel):
    id_foto: int
    id_cancha: int
    url_foto: str
    orden: int

DiaSemana = Literal[
    "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"
]

class ReglaPrecioCreateIn(BaseModel):
    """
    Regla de precio por cancha para una franja horaria.
    Si 'dia' es None, aplica a todos los días.
    'precio_por_hora' se interpreta como NETO o BRUTO según config (settings.PRECIOS_INCLUYEN_IVA).
    """
    id_cancha: int
    dia: Optional[DiaSemana] = None
    hora_inicio: time
    hora_fin: time
    precio_por_hora: NonNegMoney
    vigente_desde: Optional[date] = None
    vigente_hasta: Optional[date] = None

class ReglaPrecioUpdateIn(BaseModel):
    """
    Actualización parcial de una regla.
    Se valida solape en la capa repository/service.
    """
    dia: Optional[DiaSemana] = None
    hora_inicio: Optional[time] = None
    hora_fin: Optional[time] = None
    precio_por_hora: Optional[NonNegMoney] = None
    vigente_desde: Optional[date] = None
    vigente_hasta: Optional[date] = None

class ReglaPrecioOut(BaseModel):
    """
    Respuesta estándar de una regla de precio.
    Las horas salen formateadas "HH:MM".
    """
    id_regla: int
    id_cancha: int
    dia: Optional[DiaSemana]
    hora_inicio: str
    hora_fin: str
    precio_por_hora: float
    vigente_desde: Optional[date]
    vigente_hasta: Optional[date]
