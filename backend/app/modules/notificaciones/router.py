# app/modules/notificaciones/router.py
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.schemas import SimpleMsg
from app.modules.auth.model import Usuario

from .schemas import (
    NotificacionOut,
    NotificacionCreateIn,
    NotificacionEmailIn,
)
from .service import NotificacionesService

router = APIRouter(prefix="/notificaciones", tags=["notificaciones"])


# --------- APP MÓVIL: listar y marcar leídas -----------------


@router.get(
    "",
    response_model=List[NotificacionOut],
    summary="Listar notificaciones del usuario autenticado",
    description="Devuelve las notificaciones asociadas al usuario actual. "
                "Puedes filtrar solo las no leídas con `solo_no_leidas=true`.",
)
def listar_mis_notificaciones(
    solo_no_leidas: bool = False,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return NotificacionesService.listar_para_usuario(
        db,
        id_usuario=current.id_usuario,
        solo_no_leidas=solo_no_leidas,
    )


@router.post(
    "/{id_notificacion}/leer",
    response_model=NotificacionOut,
    summary="Marcar una notificación como leída",
    description="Marca como leída una notificación del usuario actual y devuelve el registro actualizado.",
)
def marcar_leida_endpoint(
    id_notificacion: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    notif = NotificacionesService.marcar_leida(
        db,
        id_notificacion=id_notificacion,
        id_usuario=current.id_usuario,
    )
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notificación no encontrada.")
    return notif


@router.post(
    "/leer-todas",
    response_model=SimpleMsg,
    summary="Marcar todas mis notificaciones como leídas",
)
def marcar_todas_leidas_endpoint(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    count = NotificacionesService.marcar_todas_leidas(
        db,
        id_usuario=current.id_usuario,
    )
    return {"message": f"Se marcaron {count} notificaciones como leídas."}


# --------- Crear notificación in-app manual (opcional) --------

@router.post(
    "",
    response_model=NotificacionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear notificación in-app (backend / admin)",
    description="Crea una notificación en la tabla para el usuario indicado. "
                "Útil para pruebas o panel de administración.",
)
def crear_notificacion_app_endpoint(
    payload: NotificacionCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),  # luego puedes exigir rol admin
):
    return NotificacionesService.crear(db, payload)


# --------- Crear notificación + enviar correo ----------------

@router.post(
    "/email",
    response_model=NotificacionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear notificación y enviar correo al usuario",
    description="Crea una fila en `notificaciones` y envía un correo al email del usuario "
                "usando la misma integración SMTP que los códigos de verificación.",
)
def enviar_notificacion_email_endpoint(
    payload: NotificacionEmailIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),  # puedes cambiar a require_admin
):
    try:
        notif = NotificacionesService.crear_y_enviar_email(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return notif
