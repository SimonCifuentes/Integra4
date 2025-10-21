from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.canchas.schemas import AdminCanchasQuery, CanchasListOut
from app.modules.canchas.service import list_canchas_panel


from app.modules.canchas.schemas import (
    CanchasQuery, CanchasListOut, CanchaCreateIn, CanchaOut, CanchaUpdateIn,
    CanchaFotoIn, CanchaFotoOut
)
from app.modules.canchas.service import (
    list_canchas as svc_list,
    create_cancha as svc_create,
    get_cancha as svc_get,
    update_cancha as svc_update,
    delete_cancha as svc_delete,
    list_fotos as svc_list_fotos,
    add_foto as svc_add_foto,
    delete_foto as svc_delete_foto,
)

router = APIRouter(prefix="/canchas", tags=["canchas"])

@router.get(
    "",
    response_model=CanchasListOut,
    summary="Lista canchas",
    description=(
        "Filtros: `q`, `id_complejo`, `deporte`, **techada** (`cubierta` o alias `techada`), "
        "`iluminacion`, `max_precio` y **cercanas** (`lat`/`lon` + `max_km`).\n\n"
        "Orden: `distancia`, `precio`, `rating`, `nombre`, `recientes`.\n"
        "Si envías `lat`/`lon` se incluye `distancia_km`."
    ),
    responses={
        200: {
            "description": "OK",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id_cancha": 45,
                                "id_complejo": 12,
                                "nombre": "Cancha 7",
                                "deporte": "fútbol",
                                "cubierta": False,
                                "activo": True,
                                "precio_desde": 12000.0,
                                "rating_promedio": 4.4,
                                "total_resenas": 54,
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
    params: CanchasQuery = Depends(),
    db: Session = Depends(get_db),
):
    return svc_list(db, params)


@router.post(
    "",
    response_model=CanchaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crea una cancha (dueño/admin)",
    description=(
        "Crea una nueva cancha dentro de un complejo. Requiere ser **dueño** del complejo, "
        "**admin** o **superadmin**. Puedes indicar el deporte por `id_deporte` o por `deporte` (nombre)."
    ),
)
def create_endpoint(
    payload: CanchaCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_create(db, current, payload)

@router.get(
    "/admin",
    response_model=CanchasListOut,
    summary="(Panel) Canchas del admin (o todas si superadmin)",
    description=(
        "Uso interno del panel.\n\n"
        "- **admin**: solo canchas de complejos donde es dueño (`complejos.id_dueno = current`).\n"
        "- **superadmin**: todas las canchas.\n\n"
        "Filtros **básicos**: `id_complejo`, `q` (nombre), `incluir_inactivas`.\n"
        "Paginación: `page`, `page_size`. Orden: `sort_by` (`nombre|precio|rating|recientes`), `order` (`asc|desc`)."
    ),
    responses={
        200: {
            "description": "Listado paginado",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id_cancha": 45,
                                "id_complejo": 12,
                                "nombre": "Cancha 7",
                                "deporte": "fútbol",
                                "cubierta": False,
                                "activo": False,
                                "precio_desde": 12000.0,
                                "rating_promedio": 4.4,
                                "total_resenas": 54,
                                "distancia_km": None
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
def list_admin_endpoint(
    # Filtros básicos y claros en Swagger
    id_complejo: int | None = Query(None, description="Filtra por complejo (solo los del admin)"),
    q: str | None = Query(None, description="Busca por nombre exacto/contiene (case-insensitive)"),
    incluir_inactivas: bool = Query(True, description="Incluir canchas con activo = false (por defecto TRUE en panel)"),
    sort_by: str = Query("nombre", pattern="^(nombre|precio|rating|recientes)$", description="Campo de orden"),
    order: str = Query("asc", pattern="^(asc|desc)$", description="Dirección del orden"),
    page: int = Query(1, ge=1, description="Página (>=1)"),
    page_size: int = Query(20, ge=1, le=100, description="Tamaño de página (1..100)"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    # Adaptamos a tu AdminCanchasQuery para reutilizar el service
    params = AdminCanchasQuery(
        id_complejo=id_complejo,
        q=q,
        incluir_inactivas=incluir_inactivas,
        sort_by=sort_by,
        order=order,
        page=page,
        page_size=page_size,
    )
    return list_canchas_panel(db, current, params)

@router.get(
    "/{id_cancha:int}",
    response_model=CanchaOut,
    summary="Detalle de una cancha",
    description=(
        "Detalle de la cancha, incluyendo `precio_desde` (mínimo vigente), rating y opcional `distancia_km`."
    ),
)
def get_endpoint(
    id_cancha: int,
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Latitud para distancia"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Longitud para distancia"),
    db: Session = Depends(get_db),
):
    return svc_get(db, id_cancha, lat, lon)

@router.patch(
    "/{id_cancha:int}",
    response_model=CanchaOut,
    summary="Edita una cancha (dueño/admin)",
    description="Actualiza nombre, deporte, si es techada o estado activo.",
)
def update_endpoint(
    id_cancha: int,
    payload: CanchaUpdateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_update(db, id_cancha, current, payload)

@router.delete(
    "/{id_cancha:int}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina/archiva cancha (dueño/admin)",
    description="Marca la cancha como inactiva (`activo = false`). Requiere dueño/admin.",
)
def delete_endpoint(
    id_cancha: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    svc_delete(db, id_cancha, current)
    return None

# ===== Fotos =====
@router.get(
    "/{id_cancha:int}/fotos",
    response_model=list[CanchaFotoOut],
    summary="Lista fotos de la cancha",
)
def list_fotos_endpoint(id_cancha: int, db: Session = Depends(get_db)):
    return svc_list_fotos(db, id_cancha)

@router.post(
    "/{id_cancha:int}/fotos",
    response_model=CanchaFotoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Agrega foto a la cancha (dueño/admin)",
    description=(
        "Agrega una URL de imagen ya subida (usa antes `/uploads/presign` o `/uploads`). "
        "Si no envías `orden`, se agrega al final."
    ),
)
def add_foto_endpoint(
    id_cancha: int,
    payload: CanchaFotoIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_add_foto(db, id_cancha, current, payload)

@router.delete(
    "/{id_cancha:int}/fotos/{id_foto}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Elimina una foto (dueño/admin)",
)
def delete_foto_endpoint(
    id_cancha: int,
    id_foto: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    svc_delete_foto(db, id_cancha, id_foto, current)
    return None

