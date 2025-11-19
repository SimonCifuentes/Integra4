from __future__ import annotations

from typing import List

from fastapi import HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.modules.auth.model import Usuario
from app.modules.horarios import repository as repo
from app.modules.horarios.schemas import (
    HorarioCreateIn,
    HorarioUpdateIn,
    HorarioOut,
)


def _es_superadmin(user: Usuario) -> bool:
    return user.rol == "superadmin"


def _es_admin_o_dueno(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin", "dueno")


def _assert_puede_admin_complejo(
    db: Session,
    user: Usuario,
    id_complejo: int,
) -> None:
    """
    Valida que el usuario tenga permiso sobre el complejo (dueño o superadmin).
    """
    if _es_superadmin(user):
        return

    if not _es_admin_o_dueno(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para administrar horarios.",
        )

    row = db.execute(
        text(
            """
            SELECT 1
            FROM complejos
            WHERE id_complejo = :cid
              AND id_dueno = :uid
            """
        ),
        {"cid": id_complejo, "uid": user.id_usuario},
    ).first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No eres dueño de este complejo.",
        )


def listar_horarios(
    db: Session,
    current: Usuario,
    id_complejo: int,
) -> List[HorarioOut]:
    if not repo.complejo_existe(db, id_complejo):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complejo no encontrado.",
        )

    _assert_puede_admin_complejo(db, current, id_complejo)

    data = repo.listar_por_complejo(db, id_complejo)
    return [HorarioOut(**h) for h in data]


def crear_horario(
    db: Session,
    current: Usuario,
    payload: HorarioCreateIn,
) -> HorarioOut:
    if not repo.complejo_existe(db, payload.id_complejo):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complejo no encontrado.",
        )

    _assert_puede_admin_complejo(db, current, payload.id_complejo)

    if payload.id_cancha is not None:
        if not repo.cancha_pertenece_a_complejo(
            db,
            id_cancha=payload.id_cancha,
            id_complejo=payload.id_complejo,
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La cancha no pertenece a este complejo.",
            )

    data = repo.crear(
        db,
        id_complejo=payload.id_complejo,
        id_cancha=payload.id_cancha,
        dia_semana=payload.dia_semana,
        hora_apertura=payload.hora_apertura,
        hora_cierre=payload.hora_cierre,
    )
    return HorarioOut(**data)


def actualizar_horario(
    db: Session,
    current: Usuario,
    id_horario: int,
    payload: HorarioUpdateIn,
) -> HorarioOut:
    actual = repo.obtener_por_id(db, id_horario)
    if not actual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado.",
        )

    id_complejo = actual["id_complejo"]
    _assert_puede_admin_complejo(db, current, id_complejo)

    data = repo.actualizar(
        db,
        id_horario,
        dia_semana=payload.dia_semana,
        hora_apertura=payload.hora_apertura,
        hora_cierre=payload.hora_cierre,
    )
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado después de actualizar.",
        )

    return HorarioOut(**data)


def eliminar_horario(
    db: Session,
    current: Usuario,
    id_horario: int,
) -> None:
    actual = repo.obtener_por_id(db, id_horario)
    if not actual:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Horario no encontrado.",
        )

    id_complejo = actual["id_complejo"]
    _assert_puede_admin_complejo(db, current, id_complejo)

    ok = repo.eliminar(db, id_horario)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No se pudo eliminar el horario.",
        )
