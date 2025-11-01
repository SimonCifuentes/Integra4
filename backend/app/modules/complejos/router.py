from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.complejos.schemas import (
    ComplejosQuery, ComplejosListOut, ComplejoOut, ComplejoCreateIn, ComplejoUpdateIn,
    CanchaOut, HorarioOut, BloqueoOut, ResumenOut
)
from app.modules.complejos.service import (
    list_complejos as svc_list,
    create_complejo as svc_create,
    get_complejo as svc_get,
    update_complejo as svc_update,
    delete_complejo as svc_delete,
    canchas as svc_canchas,
    horarios as svc_horarios,
    bloqueos as svc_bloqueos,
    resumen as svc_resumen,
)

router = APIRouter(prefix="/complejos", tags=["complejos"])

@router.get(
    "",
    response_model=ComplejosListOut,
    summary="Listar complejos",
    description=(
        "Lista recintos con **filtros**: texto (`q`), `comuna` (nombre), `id_comuna` (FK), `deporte`, y **distancia** (lat/lon + `max_km`). "
        "Orden por `distancia`, `rating`, `nombre` o `recientes`. Soporta paginación."
    ),
    response_description="Listado paginado de complejos."
)
@router.get(
    "",
    response_model=ComplejosListOut,
    summary="Listar complejos",
    description=(
        "Lista recintos con filtros: texto (`q`), `comuna` (nombre), `id_comuna` (FK), `deporte`, "
        "y filtros espaciales. Soporta dos modos:\n\n"
        "1) Radio cercano: (`lat`, `lon`, `max_km`).\n"
        "2) Bounds visibles del mapa: (`ne_lat`, `ne_lon`, `sw_lat`, `sw_lon`).\n\n"
        "Si se envían los bounds completos, tienen prioridad sobre el radio.\n\n"
        "Orden por `distancia`, `rating`, `nombre` o `recientes`. Soporta paginación."
    ),
    response_description="Listado paginado de complejos."
)
def list_endpoint(
    # --- filtros de texto / metadata ---
    q: str | None = Query(None, description="Búsqueda por nombre/dirección/comuna"),
    comuna: str | None = Query(None, description="Nombre exacto de la comuna"),
    id_comuna: int | None = Query(None, description="ID de comuna si tu esquema usa FK"),
    deporte: str | None = Query(None, description="Ej: futbol, tenis..."),

    # --- modo radio (cercanos clásicos) ---
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    max_km: float | None = Query(None, gt=0),

    # --- 🔥 NUEVO: bounds del viewport del mapa ---
    ne_lat: float | None = Query(
        None, ge=-90, le=90,
        description="Latitud esquina NOR-ESTE del mapa visible"
    ),
    ne_lon: float | None = Query(
        None, ge=-180, le=180,
        description="Longitud esquina NOR-ESTE del mapa visible"
    ),
    sw_lat: float | None = Query(
        None, ge=-90, le=90,
        description="Latitud esquina SUR-OESTE del mapa visible"
    ),
    sw_lon: float | None = Query(
        None, ge=-180, le=180,
        description="Longitud esquina SUR-OESTE del mapa visible"
    ),

    # --- orden / paginación ---
    sort_by: str | None = Query(
        "nombre",
        pattern="^(distancia|rating|nombre|recientes)$"
    ),
    order: str | None = Query(
        "asc",
        pattern="^(asc|desc)$"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),

    db: Session = Depends(get_db),
):
    """
    Retorna una lista paginada de complejos.
    - Si mandas los 4 bounds (`ne_lat`, `ne_lon`, `sw_lat`, `sw_lon`), se filtra por el rectángulo visible.
    - Si NO mandas bounds pero mandas (`lat`, `lon`, `max_km`), se filtra por radio en km.
    - Si no mandas ni bounds ni radio, lista normal con otros filtros.
    """
    params = ComplejosQuery(
        q=q,
        comuna=comuna,
        id_comuna=id_comuna,
        deporte=deporte,

        # modo radio
        lat=lat,
        lon=lon,
        max_km=max_km,

        # modo bounds
        ne_lat=ne_lat,
        ne_lon=ne_lon,
        sw_lat=sw_lat,
        sw_lon=sw_lon,

        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )

    return svc_list(db, params)


@router.post(
    "",
    response_model=ComplejoOut,
    summary="Crear complejo",
    description="Crea un **complejo**. Puedes enviar `comuna` (texto) o `id_comuna` (FK). Requiere rol **dueño** o **admin/superadmin**.",
    response_description="Complejo creado."
)
def create_endpoint(
    payload: ComplejoCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_create(db, current, payload)

@router.get(
    "/{id_complejo}",
    response_model=ComplejoOut,
    summary="Detalle de complejo",
    description="Obtiene el **detalle** de un complejo. Si envías `lat` y `lon`, incluye `distancia_km`.",
    response_description="Datos del complejo."
)
def get_endpoint(
    id_complejo: int,
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    db: Session = Depends(get_db),
):
    return svc_get(db, id_complejo, lat, lon)

@router.patch(
    "/{id_complejo}",
    response_model=ComplejoOut,
    summary="Editar complejo",
    description="Actualiza datos del complejo. Puedes cambiar `comuna` o `id_comuna` según tu esquema. Solo **dueño** o **admin/superadmin**.",
    response_description="Complejo actualizado."
)
def patch_endpoint(
    id_complejo: int,
    payload: ComplejoUpdateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_update(db, current, id_complejo, payload)

@router.delete(
    "/{id_complejo}",
    summary="Eliminar/archivar complejo",
    description="Desactiva (soft delete) un complejo. Solo **dueño** o **admin/superadmin**.",
    response_description="Confirmación de desactivación."
)
def delete_endpoint(
    id_complejo: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_delete(db, current, id_complejo)

@router.get(
    "/{id_complejo}/canchas",
    response_model=list[CanchaOut],
    summary="Canchas del complejo",
    description="Lista las **canchas** pertenecientes al complejo.",
    response_description="Canchas del complejo."
)
def canchas_endpoint(
    id_complejo: int,
    db: Session = Depends(get_db),
):
    return svc_canchas(db, id_complejo)

@router.get(
    "/{id_complejo}/horarios",
    response_model=list[HorarioOut],
    summary="Horarios de atención",
    description="Horarios de atención a nivel de **complejo** (y, si existen, específicos por cancha).",
    response_description="Horarios de atención."
)
def horarios_endpoint(
    id_complejo: int,
    db: Session = Depends(get_db),
):
    return svc_horarios(db, id_complejo)

@router.get(
    "/{id_complejo}/bloqueos",
    response_model=list[BloqueoOut],
    summary="Bloqueos y cierres",
    description="Lista los **bloqueos/cierres** del complejo (y opcionalmente por cancha).",
    response_description="Bloqueos del complejo."
)
def bloqueos_endpoint(
    id_complejo: int,
    db: Session = Depends(get_db),
):
    return svc_bloqueos(db, id_complejo)

@router.get(
    "/{id_complejo}/resumen",
    response_model=ResumenOut,
    summary="Resumen (KPIs) del recinto",
    description=(
        "KPIs del recinto en un rango de fechas (`desde`, `hasta` en formato YYYY-MM-DD). "
        "Si no se envían, usa los **últimos 30 días**."
    ),
    response_description="Resumen de KPIs."
)
def resumen_endpoint(
    id_complejo: int,
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    hasta: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
):
    return svc_resumen(db, id_complejo, desde, hasta)
