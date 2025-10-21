# app/modules/reservas/router.py
from __future__ import annotations
from typing import Optional
from fastapi import APIRouter, Depends, Query, Path, status, HTTPException
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user, require_roles
from app.modules.auth.model import Usuario
from app.modules.reservas.service import Service
from app.modules.reservas.schemas import (
    ReservaOut, ReservaCreateIn, QuoteIn, QuoteOut, ReservaPatchIn
)

# Router normal (público/autenticado)
router = APIRouter(
    prefix="/reservas",
    tags=["reservas"],
)

# Subrouter para alias del panel (admin/superadmin)
admin = APIRouter(
    prefix="/reservas/admin",
    tags=["reservas (panel)"],
)

# =========================
# Alias Panel (BFF) - ADMIN / SUPERADMIN
# =========================

@admin.get(
    "/cancha/{id_cancha:int}",
    response_model=list[ReservaOut],
    summary="(Panel) Reservas por cancha",
    description=(
        "Devuelve reservas asociadas a **una cancha**.\n\n"
        "- **admin**: solo verá reservas de canchas que pertenecen a sus complejos.\n"
        "- **superadmin**: verá todas las reservas de la cancha indicada.\n\n"
        "Útil para el panel de administración."
    ),
    responses={
        200: {"description": "Listado de reservas"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Cancha o reservas no encontradas"},
    },
)
def reservas_por_cancha(
    id_cancha: int = Path(..., gt=0, description="ID de la cancha"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    filtros = {"id_cancha": id_cancha}
    return Service.listar(db, filtros=filtros, user=current)


@admin.get(
    "/usuario/{id_usuario:int}",
    response_model=list[ReservaOut],
    summary="(Panel) Reservas por usuario",
    description=(
        "Devuelve reservas de **un usuario**.\n\n"
        "- **admin**: solo verá reservas que ocurren dentro de sus complejos.\n"
        "- **superadmin**: verá todas las reservas del usuario.\n\n"
        "Útil para el panel de administración."
    ),
    responses={
        200: {"description": "Listado de reservas"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Usuario o reservas no encontradas"},
    },
)
def reservas_por_usuario(
    id_usuario: int = Path(..., gt=0, description="ID del usuario"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    filtros = {"id_usuario": id_usuario}
    return Service.listar(db, filtros=filtros, user=current)


@admin.post(
    "/crear",
    response_model=ReservaOut,
    status_code=status.HTTP_201_CREATED,
    summary="(Panel) Crear reserva como admin",
    description=(
        "Crea una reserva **en nombre de cualquier usuario**.\n\n"
        "- **admin**: únicamente en canchas de sus complejos.\n"
        "- **superadmin**: en cualquier cancha.\n\n"
        "El Service valida disponibilidad, reglas de precio y promos."
    ),
    responses={
        201: {
            "description": "Reserva creada",
            "content": {
                "application/json": {
                    "example": {
                        "id_reserva": 123,
                        "id_usuario": 40,
                        "id_cancha": 7,
                        "inicio": "2025-10-22T18:00:00-03:00",
                        "fin": "2025-10-22T19:00:00-03:00",
                        "estado": "pendiente",
                        "precio_total": 12000.0,
                        "notas": None
                    }
                }
            },
        },
        400: {"description": "Validación / sin disponibilidad"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
    },
)
def crear_reserva_admin(
    payload: ReservaCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    data = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    return Service.crear(db, data, user_id=current.id_usuario)


@admin.post(
    "/{id_reserva:int}/cancelar",
    response_model=ReservaOut,
    summary="(Panel) Cancelar reserva",
    description=(
        "Cancela una reserva desde el panel.\n\n"
        "- **admin**: solo reservas dentro de sus complejos.\n"
        "- **superadmin**: cualquier reserva."
    ),
    responses={
        200: {"description": "Reserva cancelada"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Reserva no encontrada"},
    },
)
def cancelar_admin(
    id_reserva: int = Path(..., gt=0, description="ID de la reserva"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if current.rol not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No autorizado")
    return Service.cancelar(db, id_reserva, user=current)

# =========================
# Rutas normales (usuario / admin / superadmin)
# =========================

@router.get(
    "/mias",
    response_model=list[ReservaOut],
    summary="Mis reservas",
    description="Devuelve todas las reservas del **usuario autenticado** (usuario/admin/superadmin).",
    responses={
        200: {"description": "Listado de reservas del usuario"},
        401: {"description": "No autenticado"},
    },
)
def mis_reservas(
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.mias(db, user_id=user.id_usuario)


@router.get(
    "",
    response_model=list[ReservaOut],
    summary="Listado de reservas (admin/superadmin)",
    description=(
        "Listado general de reservas.\n\n"
        "- **admin**: limitado a sus complejos/canchas.\n"
        "- **superadmin**: sin restricción.\n\n"
        "Filtros opcionales: `estado`, `desde`, `hasta`, `id_complejo`, `id_cancha`."
    ),
    responses={
        200: {"description": "Listado de reservas"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
    },
)
def listar_reservas(
    estado: str | None = Query(None, pattern="^(pendiente|confirmada|cancelada|expirada)$", description="Filtra por estado"),
    desde: str | None = Query(None, description="Filtro desde (YYYY-MM-DD)"),
    hasta: str | None = Query(None, description="Filtro hasta (YYYY-MM-DD)"),
    id_complejo: int | None = Query(None, gt=0, description="Debe pertenecer al admin si se usa"),
    id_cancha: int | None = Query(None, gt=0, description="Debe pertenecer al admin si se usa"),
    user: Usuario = Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db)
):
    filtros = {"estado": estado, "desde": desde, "hasta": hasta,
               "id_complejo": id_complejo, "id_cancha": id_cancha}
    return Service.listar(db, filtros=filtros, user=user)


@router.get(
    "/{id_reserva:int}",
    response_model=ReservaOut,
    summary="Detalle de reserva",
    description=(
        "Muestra el detalle de una reserva.\n\n"
        "- **usuario**: solo si es el dueño de la reserva.\n"
        "- **admin**: solo si la reserva pertenece a su complejo.\n"
        "- **superadmin**: sin restricción."
    ),
    responses={
        200: {"description": "Detalle de la reserva"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Reserva no encontrada"},
    },
)
def detalle_reserva(
    id_reserva: int = Path(..., gt=0, description="ID de la reserva"),
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.detalle(db, id_reserva, user)


@router.post(
    "/cotizar",
    response_model=QuoteOut,
    summary="Cotizar reserva (precio)",
    description="Calcula el precio de una solicitud de reserva en base a **reglas vigentes** y **promociones**.",
    responses={
        200: {
            "description": "Cotización",
            "content": {
                "application/json": {
                    "example": {
                        "precio_por_hora": 12000.0,
                        "horas": 1.0,
                        "subtotal": 12000.0,
                        "descuento": 2000.0,
                        "total": 10000.0,
                        "promo_aplicada": "Promo Lunes"
                    }
                }
            },
        },
        400: {"description": "Validación/fechas inválidas"},
        401: {"description": "No autenticado"},
    },
)
def cotizar(
    body: QuoteIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    data = body.model_dump() if hasattr(body, "model_dump") else body.dict()
    return Service.cotizar(db, data, user_id=user.id_usuario)


@router.post(
    "",
    response_model=ReservaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear reserva",
    description="Crea una nueva reserva en estado **pendiente** si hay disponibilidad.",
    responses={
        201: {"description": "Reserva creada"},
        400: {"description": "Validación / sin disponibilidad"},
        401: {"description": "No autenticado"},
    },
)
def crear_reserva(
    body: ReservaCreateIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    data = body.model_dump() if hasattr(body, "model_dump") else body.dict()
    return Service.crear(db, data, user_id=user.id_usuario)


@router.patch(
    "/{id_reserva:int}",
    response_model=ReservaOut,
    summary="Reprogramar / editar",
    description=(
        "Modifica fechas/horas/observaciones de una reserva.\n\n"
        "- **usuario**: solo reservas propias.\n"
        "- **admin**: solo reservas de sus complejos.\n"
        "- **superadmin**: todas."
    ),
    responses={
        200: {"description": "Reserva actualizada"},
        400: {"description": "Validación / choque de horarios"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Reserva no encontrada"},
    },
)
def editar_reserva(
    id_reserva: int = Path(..., gt=0, description="ID de la reserva"),
    body: ReservaPatchIn = ...,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    data = body.model_dump(exclude_unset=True) if hasattr(body, "model_dump") else body.dict(exclude_unset=True)
    return Service.editar(db, id_reserva, data, user)


@router.post(
    "/{id_reserva:int}/confirmar",
    response_model=ReservaOut,
    summary="Confirmar (admin/superadmin)",
    description="Confirma una reserva. **Admin** solo puede confirmar reservas de su complejo.",
    responses={
        200: {"description": "Reserva confirmada"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Reserva no encontrada"},
    },
)
def confirmar_reserva(
    id_reserva: int = Path(..., gt=0, description="ID de la reserva"),
    user: Usuario = Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.confirmar(db, id_reserva, user)


@router.post(
    "/{id_reserva:int}/cancelar",
    response_model=ReservaOut,
    summary="Cancelar reserva",
    description=(
        "Cancela una reserva.\n\n"
        "- **usuario**: cancela sus reservas.\n"
        "- **admin**: cancela dentro de su complejo.\n"
        "- **superadmin**: cualquiera."
    ),
    responses={
        200: {"description": "Reserva cancelada"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado"},
        404: {"description": "Reserva no encontrada"},
    },
)
def cancelar_reserva(
    id_reserva: int = Path(..., gt=0, description="ID de la reserva"),
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.cancelar(db, id_reserva, user)

# Montar el subrouter admin debajo del mismo módulo
router.include_router(admin)
