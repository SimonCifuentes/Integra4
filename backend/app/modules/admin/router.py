from fastapi import APIRouter, Depends, HTTPException, Body, Path, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.usuarios.repository import get_by_id, set_user_role
from .schemas import SetRolIn, DemoteRolIn
from typing import Annotated, Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from .schemas import AdminMeOut, ComplejoMiniOut
from app.modules.admin.service import AdminService 
from app.modules.admin.schemas import AdminItem, AdminSearchOut
from app.modules.admin.repository import search_admins


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

@router.get(
    "/me",
    response_model=AdminMeOut,
    summary="Obtiene mi id y rol (admin/dueno/superadmin)",
    description="Devuelve id_usuario, rol, email y nombre del usuario autenticado con rol admin/dueno/superadmin.",
)
def admin_me(
    user: Usuario = Depends(require_roles("admin", "dueno", "superadmin"))
):
    return AdminMeOut(
        id_usuario=user.id_usuario,
        rol=user.rol,
        email=user.email,
        nombre=user.nombre,
        apellido=user.apellido,
    )

@router.get(
    "/mis-complejos",
    response_model=List[ComplejoMiniOut],
    summary="Lista complejos asociados a mi usuario",
    description=(
        "Retorna los complejos donde soy dueño (id_dueno = mi id). "
        "Si eres superadmin, puedes pasar ?id_usuario=<id> para consultar por otro usuario."
    ),
)
def mis_complejos(
    id_usuario: Annotated[Optional[int], Query(description="Solo superadmin: consultar por otro usuario")] = None,
    user: Usuario = Depends(require_roles("admin", "dueno", "superadmin")),
    db: Session = Depends(get_db),
):
    # superadmin puede inspeccionar a otro usuario
    target_user_id = id_usuario if (id_usuario and user.rol == "superadmin") else user.id_usuario
    # si pasó id_usuario pero no es superadmin, error
    if id_usuario and user.rol != "superadmin":
        raise HTTPException(status_code=403, detail="Solo superadmin puede consultar por otro usuario.")

    return AdminService.complejos_por_dueno(db, user_id=target_user_id)

@router.get(
    "/admins",
    response_model=AdminSearchOut,
    summary="(PÚBLICO) Buscar admins/dueños y obtener sus IDs",
    description=(
        "Endpoint público para listar usuarios con rol 'admin' o 'dueno'. "
        "Permite filtrar por nombre, apellido o email; incluye paginación."
    ),
)
def public_search_admins(
    q: Annotated[Optional[str], Query(description="Texto a buscar en nombre, apellido o email")] = None,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    db: Session = Depends(get_db),
):
    items, total = search_admins(db, q=q, page=page, page_size=page_size)
    return AdminSearchOut(items=items, total=total, page=page, page_size=page_size)