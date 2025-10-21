from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.complejos.schemas import (
    ComplejosQuery, ComplejosListOut, ComplejoOut, ComplejoCreateIn, ComplejoUpdateIn,
    CanchaOut, HorarioOut, BloqueoOut, ResumenOut
)
from app.modules.complejos.service import list_complejos_by_owner as svc_list_by_owner
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
        "Lista recintos con **filtros**: texto (`q`), `comuna`/`id_comuna`, `deporte`, "
        "y **distancia** (`lat`/`lon` + `max_km`). Orden por `distancia`, `rating`, `nombre` o `recientes`."
    ),
    response_description="Listado paginado de complejos.",
    responses={
        200: {
            "description": "OK",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id_complejo": 12,
                                "id_dueno": 3,
                                "nombre": "Complejo Deportivo La Araucanía",
                                "direccion": "Av. Alemania 1234",
                                "comuna": "Temuco",
                                "id_comuna": 9101,
                                "latitud": -38.73799,
                                "longitud": -72.59037,
                                "descripcion": "Canchas techadas con iluminación.",
                                "activo": True,
                                "rating_promedio": 4.6,
                                "total_resenas": 128,
                                "distancia_km": 1.35
                            }
                        ],
                        "total": 1,
                        "page": 1,
                        "page_size": 20
                    }
                }
            }
        }
    }
)
def list_endpoint(
    q: str | None = Query(None, description="Búsqueda por nombre/dirección/comuna"),
    comuna: str | None = Query(None, description="Nombre exacto de la comuna"),
    id_comuna: int | None = Query(None, description="ID de comuna (si usas FK)"),
    deporte: str | None = Query(None),
    lat: float | None = Query(None, ge=-90, le=90),
    lon: float | None = Query(None, ge=-180, le=180),
    max_km: float | None = Query(None, gt=0),
    sort_by: str | None = Query("nombre", pattern="^(distancia|rating|nombre|recientes)$"),
    order: str | None = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    params = ComplejosQuery(
        q=q, comuna=comuna, id_comuna=id_comuna, deporte=deporte,
        lat=lat, lon=lon, max_km=max_km,
        sort_by=sort_by, order=order, page=page, page_size=page_size
    )
    return svc_list(db, params)

@router.get(
    "/duenio/{duenio_id:int}",
    response_model=list[ComplejoOut],
    summary="(Panel) Complejos de un dueño/admin",
    description="Devuelve los complejos cuyo `id_dueno` coincide. Admin: solo los suyos. Superadmin: cualquiera."
)
def list_by_owner_endpoint(
    duenio_id: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_list_by_owner(db, current, duenio_id)

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
