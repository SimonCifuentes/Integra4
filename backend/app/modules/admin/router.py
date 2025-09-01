from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.usuarios.repository import get_by_id, set_user_role  # o update_user_admin
from .schemas import SetRolIn

router = APIRouter(tags=["admin"])  # ya tienes prefix="/admin" en api/v1/router.py

def _is_admin(u: Usuario) -> bool:
    return u.rol in ("admin","superadmin")

def _is_super(u: Usuario) -> bool:
    return u.rol == "superadmin"

@router.post(
    "/usuarios/{id_usuario}/rol",
    summary="Cambiar rol de un usuario",
    description=(
        "Cambia el rol de un usuario. "
        "**superadmin** puede asignar cualquier rol. "
        "**admin** solo puede asignar `usuario` o `dueno` (no puede crear/admin/superadmin)."
    )
)
def set_role_endpoint(
    id_usuario: int,
    payload: SetRolIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    if not _is_admin(current):
        raise HTTPException(status_code=403, detail="No autorizado")

    target = get_by_id(db, id_usuario)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # reglas:
    if payload.rol in ("admin","superadmin") and not _is_super(current):
        raise HTTPException(status_code=403, detail="Solo superadmin puede asignar admin/superadmin")

    # evitar que un admin se suba a sí mismo a superadmin si no lo es
    if target.id_usuario == current.id_usuario and payload.rol == "superadmin" and not _is_super(current):
        raise HTTPException(status_code=403, detail="No puedes elevarte de privilegio")

    set_user_role(db, target, payload.rol)  # o update_user_admin(..., rol=payload.rol, ...)
    return {"detail": f"Rol actualizado a {payload.rol}"}
