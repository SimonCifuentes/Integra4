from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.complejos.schemas import (
    ComplejoCreateIn,
    ComplejoUpdateIn,
    ComplejoOut,
)
from app.modules.complejos.service import (
    list_complejos_admin,
    create_complejo as svc_create,
    update_complejo as svc_update,
    delete_complejo as svc_delete,
)

router = APIRouter(
    prefix="/admin/complejos",
    tags=["admin-complejos"],
)


@router.get(
    "",
    response_model=List[ComplejoOut],
    summary="Listar complejos (admin)",
    description=(
        "Lista los complejos que el usuario puede administrar.\n\n"
        "- `dueno`: solo sus propios complejos.\n"
        "- `admin` / `superadmin`: todos los complejos activos."
    ),
)
def list_admin_complejos_endpoint(
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return list_complejos_admin(db, current)


@router.post(
    "",
    response_model=ComplejoOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear complejo (admin)",
    description=(
        "Crea un nuevo complejo.\n\n"
        "Requiere rol `dueno`, `admin` o `superadmin`. "
        "Reutiliza la misma lógica que `POST /complejos`."
    ),
)
def create_admin_complejo_endpoint(
    payload: ComplejoCreateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_create(db, current, payload)


@router.patch(
    "/{id_complejo}",
    response_model=ComplejoOut,
    summary="Editar complejo (admin)",
    description=(
        "Actualiza un complejo existente.\n\n"
        "- Solo el dueño del complejo o un `admin/superadmin` puede editar."
    ),
)
def update_admin_complejo_endpoint(
    id_complejo: int,
    payload: ComplejoUpdateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_update(db, current, id_complejo, payload)


@router.delete(
    "/{id_complejo}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar complejo (admin)",
    description="Desactiva un complejo (soft delete).",
)
def delete_admin_complejo_endpoint(
    id_complejo: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    svc_delete(db, current, id_complejo)
    return None
