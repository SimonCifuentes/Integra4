from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.usuarios.schemas import (
    UsuariosQuery, UsuariosListOut, UsuarioDetailOut, UsuarioUpdateIn
)
from app.modules.usuarios.service import (
    list_users as svc_list_users,
    get_user as svc_get_user,
    patch_user as svc_patch_user,
    delete_user as svc_delete_user,
)

router = APIRouter(prefix="/usuarios", tags=["usuarios"])

@router.get(
    "",
    response_model=UsuariosListOut,
    summary="Listar usuarios",
    description="Lista usuarios con **filtros y paginación**. Requiere rol **admin/superadmin** o **dueño** (owner) según política.",
    response_description="Listado paginado de usuarios."
)
def list_usuarios_endpoint(
    q: str | None = Query(None, description="Búsqueda por nombre, apellido o email"),
    rol: str | None = Query(None, pattern="^(usuario|dueno|admin|superadmin)$"),
    activo: bool | None = Query(None, description="Filtrar por usuarios activos/inactivos"),
    verificado: bool | None = Query(None, description="Filtrar por verificación de correo"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    order_by: str = Query("id_usuario", pattern="^(id_usuario|nombre|apellido|email)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    params = UsuariosQuery(
        q=q, rol=rol, activo=activo, verificado=verificado,
        page=page, page_size=page_size, order_by=order_by, order=order
    )
    return svc_list_users(db, current, params)

@router.get(
    "/{id_usuario}",
    response_model=UsuarioDetailOut,
    summary="Obtener usuario por ID",
    description="Devuelve un usuario por su **ID**. Puede acceder **admin/superadmin/dueño** o el **propio usuario**.",
    response_description="Usuario encontrado."
)
def get_usuario_endpoint(
    id_usuario: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_get_user(db, current, id_usuario)

@router.patch(
    "/{id_usuario}",
    response_model=UsuarioDetailOut,
    summary="Actualizar usuario",
    description=(
        "Actualiza datos de un usuario. "
        "- **Admin/Superadmin**: puede cambiar rol, verificado y estado activo, además de datos básicos. "
        "- **El propio usuario**: solo puede cambiar nombre, apellido, teléfono y avatar."
    ),
    response_description="Usuario actualizado."
)
def patch_usuario_endpoint(
    id_usuario: int,
    payload: UsuarioUpdateIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_patch_user(db, current, id_usuario, payload)

@router.delete(
    "/{id_usuario}",
    summary="Desactivar usuario",
    description="Desactiva (soft delete) un usuario. **Solo admin/superadmin**. No permite desactivar al propio admin autenticado.",
    response_description="Confirmación de desactivación."
)
def delete_usuario_endpoint(
    id_usuario: int,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_delete_user(db, current, id_usuario)
