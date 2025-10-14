from fastapi import APIRouter, Depends, HTTPException, Body, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.usuarios.repository import get_by_id, set_user_role
from .schemas import SetRolIn, DemoteRolIn

router = APIRouter(tags=["admin"])  # prefix="/admin" lo pones en api/v1/router.py

# ---------- PROMOVER (ya lo tenías) ----------
@router.post(
    "/usuarios/{id_usuario}/rol",
    summary="(Superadmin) Promocionar rol de un usuario",
    description=(
        "Solo **superadmin** puede usar este endpoint. Permite **promover** a:\n"
        "- `admin`\n"
        "- `superadmin`\n\n"
        "No permite degradar ni asignar otros roles."
    ),
    responses={
        200: {"content": {"application/json": {"example": {"detail": "Rol actualizado a admin"}}}},
        403: {"description": "No autorizado (no eres superadmin)."},
        404: {"description": "Usuario no encontrado."},
        422: {"description": "Rol inválido para este endpoint."}
    }
)
def promote_role(
    id_usuario: int = Path(..., ge=1, description="ID del usuario a promover."),
    payload: SetRolIn = Body(
        ...,
        examples={
            "promover_a_admin": {"summary": "Promover a admin", "value": {"rol": "admin"}},
            "promover_a_superadmin": {"summary": "Promover a superadmin", "value": {"rol": "superadmin"}}
        }
    ),
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles("superadmin")),
):
    if payload.rol not in ("admin", "superadmin"):
        raise HTTPException(422, "Solo se puede asignar 'admin' o 'superadmin'.")

    target = get_by_id(db, id_usuario)
    if not target:
        raise HTTPException(404, "Usuario no encontrado")

    if target.rol == payload.rol:
        return {"detail": f"El usuario ya es {payload.rol}"}

    set_user_role(db, target, payload.rol)
    db.commit()
    return {"detail": f"Rol actualizado a {payload.rol}"}

# ---------- NUEVO: BAJAR DE RANGO ----------
@router.post(
    "/usuarios/{id_usuario}/rol/demote",
    summary="(Superadmin) Bajar de rango a un usuario",
    description=(
        "Solo **superadmin** puede usar este endpoint. Permite **degradar** a:\n"
        "- `admin` → `usuario`\n"
        "- `superadmin` → `admin` (o `usuario`, opcional, siempre que **no sea el último superadmin**)\n\n"
        "Protecciones:\n"
        "• No te puedes bajar **a ti mismo**.\n"
        "• Evita dejar al sistema sin **superadmin**."
    ),
    responses={
        200: {"content": {"application/json": {"example": {"detail": "Rol actualizado a usuario"}}}},
        403: {"description": "No autorizado o intento de auto-degradación."},
        404: {"description": "Usuario no encontrado."},
        422: {"description": "Rol destino inválido o violación de 'último superadmin'."}
    }
)
def demote_role(
    id_usuario: int = Path(..., ge=1, description="ID del usuario a degradar."),
    payload: DemoteRolIn = Body(
        ...,
        examples={
            "admin_a_usuario": {"summary": "Admin → Usuario", "value": {"rol": "usuario"}},
            "superadmin_a_admin": {"summary": "Superadmin → Admin", "value": {"rol": "admin"}}
            # Si quieres permitir Superadmin → Usuario directamente, manda {"rol": "usuario"}
        }
    ),
    db: Session = Depends(get_db),
    current: Usuario = Depends(require_roles("superadmin")),
):
    # 1) No auto-degradación
    if current.id_usuario == id_usuario:
        raise HTTPException(status_code=403, detail="No puedes bajarte el rol a ti mismo.")

    # 2) Buscar target
    target = get_by_id(db, id_usuario)
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 3) Validar rol destino
    if payload.rol not in ("admin", "usuario"):
        raise HTTPException(status_code=422, detail="Rol destino inválido: usa 'admin' o 'usuario'.")

    # 4) Reglas de degradación
    if target.rol == "usuario":
        return {"detail": "El usuario ya es usuario"}  # nada que hacer

    if target.rol == "admin":
        # admin -> usuario
        if payload.rol != "usuario":
            raise HTTPException(422, detail="De un admin solo puedes bajar a 'usuario'.")
    elif target.rol == "superadmin":
        # superadmin -> admin/usuario (verificar que no deje al sistema sin superadmin)
        # ¿quedan más superadmins?
        remaining_supers = db.execute(
            text("SELECT COUNT(*) FROM usuarios WHERE rol = 'superadmin' AND id_usuario <> :id"),
            {"id": target.id_usuario}
        ).scalar_one()
        if remaining_supers == 0:
            raise HTTPException(422, detail="No puedes degradar al último superadmin.")

        # permitido bajar a 'admin' o directamente a 'usuario'
        # (si no quieres permitir directo a usuario, reemplaza esta sección por validación estricta a 'admin' solamente)

    # 5) Aplicar cambio
    if target.rol == payload.rol:
        return {"detail": f"El usuario ya es {payload.rol}"}

    set_user_role(db, target, payload.rol)
    db.commit()
    return {"detail": f"Rol actualizado a {payload.rol}"}
