from __future__ import annotations
from typing import Optional, Literal, List, Annotated
from pydantic import BaseModel, Field

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
    cubierta: Optional[bool] = Field(None, description="Solo techadas/no techadas")
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
