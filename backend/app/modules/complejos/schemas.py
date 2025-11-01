from __future__ import annotations
from typing import Optional, Literal, List, Annotated
from pydantic import BaseModel, Field

# ---- Tipos restringidos (Pydantic v2) ----
Lat = Annotated[float, Field(ge=-90, le=90)]
Lon = Annotated[float, Field(ge=-180, le=180)]
PositiveKm = Annotated[float, Field(gt=0)]
Page = Annotated[int, Field(ge=1)]
PageSize = Annotated[int, Field(ge=1, le=100)]

# ====== Entradas ======
class ComplejoCreateIn(BaseModel):
    nombre: str = Field(..., min_length=2, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    # Envía uno o ambos; usamos el que aplique a tu esquema
    comuna: Optional[str] = Field(None, description="Nombre de la comuna (si tu esquema usa texto)")
    id_comuna: Optional[int] = Field(None, description="ID de la comuna (si tu esquema usa FK)")
    latitud: Optional[Lat] = None
    longitud: Optional[Lon] = None
    descripcion: Optional[str] = None

class ComplejoUpdateIn(BaseModel):
    nombre: Optional[str] = Field(None, min_length=2, max_length=150)
    direccion: Optional[str] = Field(None, max_length=255)
    comuna: Optional[str] = None
    id_comuna: Optional[int] = None
    latitud: Optional[Lat] = None
    longitud: Optional[Lon] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None  # <-- columna real en tu BD

class ComplejosQuery(BaseModel):
    q: Optional[str] = Field(None, description="Texto libre en nombre/dirección/comuna")
    comuna: Optional[str] = None
    id_comuna: Optional[int] = None
    deporte: Optional[str] = Field(None, description="Complejos con al menos 1 cancha de este deporte")
    lat: Optional[Lat] = None
    lon: Optional[Lon] = None
    max_km: Optional[PositiveKm] = Field(None, description="Radio máximo en km (requiere lat/lon)")
    sort_by: Optional[Literal["distancia", "rating", "nombre", "recientes"]] = "nombre"
    order: Optional[Literal["asc", "desc"]] = "asc"
    page: Page = 1
    page_size: PageSize = 20

# ====== Salidas ======
class ComplejoOut(BaseModel):
    id_complejo: int
    id_dueno: int
    nombre: str
    direccion: Optional[str]
    comuna: Optional[str] = None
    id_comuna: Optional[int] = None
    latitud: Optional[float]
    longitud: Optional[float]
    descripcion: Optional[str]
    activo: bool  # <-- columna real
    rating_promedio: Optional[float] = Field(None, description="Promedio 1..5")
    total_resenas: int = 0
    distancia_km: Optional[float] = Field(None, description="Si se envió lat/lon")

class ComplejosListOut(BaseModel):
    items: List[ComplejoOut]
    total: int
    page: int
    page_size: int

class CanchaOut(BaseModel):
    id_cancha: int
    id_complejo: int
    nombre: str
    deporte: str
    superficie: Optional[str] = None
    capacidad: Optional[int] = None
    iluminacion: bool
    techada: bool
    esta_activa: bool

class HorarioOut(BaseModel):
    id_horario: int
    id_complejo: int
    id_cancha: Optional[int] = None
    dia_semana: str
    hora_apertura: str
    hora_cierre: str

class BloqueoOut(BaseModel):
    id_bloqueo: int
    id_complejo: int
    id_cancha: int
    fecha_inicio: str
    fecha_fin: str
    hora_inicio: Optional[str] = None
    hora_fin: Optional[str] = None
    motivo: Optional[str] = None

class ResumenOut(BaseModel):
    id_complejo: int
    desde: str
    hasta: str
    reservas_confirmadas: int
    horas_reservadas: float
    ingresos_confirmados: float
    ocupacion: float = Field(..., description="0..1 aprox. horas reservadas / (horas disponibles * #canchas)")

class ComplejosQuery(BaseModel):
    q: Optional[str] = Field(None, description="Texto libre en nombre/dirección/comuna")
    comuna: Optional[str] = None
    id_comuna: Optional[int] = None
    deporte: Optional[str] = Field(None, description="Complejos con al menos 1 cancha de este deporte")
    lat: Optional[Lat] = None
    lon: Optional[Lon] = None
    max_km: Optional[PositiveKm] = Field(None, description="Radio máximo en km (requiere lat/lon)")
    sort_by: Optional[Literal["distancia", "rating", "nombre", "recientes"]] = "nombre"
    order: Optional[Literal["asc", "desc"]] = "asc"
    page: Page = 1
    page_size: PageSize = 20

class ComplejosQuery(BaseModel):
    q: Optional[str] = Field(
        None,
        description="Texto libre en nombre/dirección/comuna"
    )

    comuna: Optional[str] = None
    id_comuna: Optional[int] = None

    deporte: Optional[str] = Field(
        None,
        description="Complejos con al menos 1 cancha de este deporte"
    )

    # --- modo 'radio' clásico (nearby actual) ---
    lat: Optional[Lat] = None
    lon: Optional[Lon] = None
    max_km: Optional[PositiveKm] = Field(
        None,
        description="Radio máximo en km (requiere lat/lon)"
    )

    # --- 🔥 NUEVO: modo 'bounds del mapa' ---
    ne_lat: Optional[Lat] = Field(
        None,
        description="Latitud esquina Noreste del viewport"
    )
    ne_lon: Optional[Lon] = Field(
        None,
        description="Longitud esquina Noreste del viewport"
    )
    sw_lat: Optional[Lat] = Field(
        None,
        description="Latitud esquina Suroeste del viewport"
    )
    sw_lon: Optional[Lon] = Field(
        None,
        description="Longitud esquina Suroeste del viewport"
    )

    # ordenamiento / paginación
    sort_by: Optional[Literal["distancia", "rating", "nombre", "recientes"]] = "nombre"
    order: Optional[Literal["asc", "desc"]] = "asc"
    page: Page = 1
    page_size: PageSize = 20

