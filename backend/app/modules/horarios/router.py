from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.horarios.schemas import (
    HorarioCreateIn,
    HorarioUpdateIn,
    HorarioOut,
)
from app.modules.horarios.service import (
    listar_horarios,
    crear_horario,
    actualizar_horario,
    eliminar_horario,
)

router = APIRouter(
    prefix="/admin/horarios",
    tags=["admin-horarios"],
)


@router.get(
    "",
    response_model=List[HorarioOut],
    summary="Listar horarios de un complejo",
    description=(
        "Devuelve los horarios de atención de un **complejo**.\n\n"
        "- Requiere rol `admin`, `dueno` o `superadmin`.\n"
        "- Un admin/dueno solo puede ver horarios de sus propios complejos.\n"
        "- Un superadmin puede ver los horarios de cualquier complejo."
    ),
)
def list_horarios_endpoint(
    id_complejo: int = Query(..., description="ID del complejo"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return listar_horarios(db, current, id_complejo)


@router.post(
    "",
    response_model=HorarioOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear horario",
    description=(
        "Crea un nuevo horario de atención.\n\n"
        "- Si `id_cancha` es `null`, el horario es **general del complejo**.\n"
        "- Si `id_cancha` tiene valor, el horario aplica solo a esa cancha.\n"
        "- Solo puede usarse por admin/dueno del complejo o superadmin."
    ),
)
def create_horario_endpoint(
    payload: HorarioCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return crear_horario(db, current, payload)


@router.put(
    "/{id_horario}",
    response_model=HorarioOut,
    summary="Actualizar horario",
    description=(
        "Actualiza un horario existente. "
        "Permite cambiar día y/o horas de apertura/cierre."
    ),
)
def update_horario_endpoint(
    id_horario: int,
    payload: HorarioUpdateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return actualizar_horario(db, current, id_horario, payload)


@router.delete(
    "/{id_horario}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar horario",
    description="Elimina un horario de atención.",
)
def delete_horario_endpoint(
    id_horario: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    eliminar_horario(db, current, id_horario)
    return None
