from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario

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
        "Devuelve canchas con filtros por **deporte**, **techada** (alias de `cubierta`), "
        "**iluminación**, **precio máximo** y **cercanas** (`lat`/`lon` + `max_km`).\n\n"
        "Ordena por `distancia`, `precio`, `rating`, `nombre` o `recientes`.\n"
        "Si envías `lat`/`lon` se calcula `distancia_km` usando PostGIS si está disponible."
    ),
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
    "/{id_cancha}",
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
    "/{id_cancha}",
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
    "/{id_cancha}",
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
    "/{id_cancha}/fotos",
    response_model=list[CanchaFotoOut],
    summary="Lista fotos de la cancha",
)
def list_fotos_endpoint(id_cancha: int, db: Session = Depends(get_db)):
    return svc_list_fotos(db, id_cancha)

@router.post(
    "/{id_cancha}/fotos",
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
    "/{id_cancha}/fotos/{id_foto}",
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
