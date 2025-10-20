from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.auth.model import Usuario
from app.modules.usuarios import repository as repo
from app.modules.usuarios.schemas import (
    UsuariosQuery, UsuariosListOut, UsuarioBaseOut, UsuarioDetailOut, UsuarioUpdateIn
)
from app.modules.auth.schemas import map_role_db_to_public

# Helper de permisos
def _is_admin_or_owner(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin", "dueno")

def _is_admin(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin")

def _to_public(user: Usuario) -> UsuarioBaseOut:
    return UsuarioBaseOut(
        id_usuario=user.id_usuario,
        nombre=user.nombre,
        apellido=user.apellido,
        email=user.email,
        telefono=user.telefono,
        avatar_url=user.avatar_url,
        rol="admin" if user.rol in ("admin", "dueno") else ("super_admin" if user.rol in ("superadmin", "super_admin") else "usuario"),
        verificado=getattr(user, "verificado", None),
        esta_activo=getattr(user, "esta_activo", None),
    )

def list_users(db: Session, current: Usuario, q: UsuariosQuery) -> UsuariosListOut:
    if not _is_admin_or_owner(current):
        # Ajusta si tu RLS permite otra cosa; por defecto solo admin/owner
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    offset = (q.page - 1) * q.page_size
    users, total = repo.search_users(
        db,
        q=q.q,
        rol=q.rol,
        activo=q.activo,
        verificado=q.verificado,
        order_by=q.order_by or "id_usuario",
        order=q.order or "asc",
        offset=offset,
        limit=q.page_size,
    )
    return UsuariosListOut(
        items=[_to_public(u) for u in users],
        total=total,
        page=q.page,
        page_size=q.page_size,
    )

def get_user(db: Session, current: Usuario, user_id: int) -> UsuarioDetailOut:
    user = repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current.id_usuario != user_id and not _is_admin_or_owner(current):
        raise HTTPException(status_code=403, detail="No autorizado")

    return _to_public(user)

def patch_user(
    db: Session,
    current: Usuario,
    user_id: int,
    data: UsuarioUpdateIn
) -> UsuarioDetailOut:
    user = repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    if current.id_usuario == user_id and not _is_admin(current):
        # Propietario actualiza solo sus campos básicos
        user = repo.update_user_self(
            db, user,
            nombre=data.nombre,
            apellido=data.apellido,
            telefono=data.telefono,
            avatar_url=data.avatar_url,
        )
    else:
        # Admin/superadmin puede actualizar todo (incl. rol, verificado, esta_activo)
        if not _is_admin(current):
            raise HTTPException(status_code=403, detail="No autorizado")
        user = repo.update_user_admin(
            db, user,
            nombre=data.nombre,
            apellido=data.apellido,
            telefono=data.telefono,
            avatar_url=data.avatar_url,
            rol=data.rol,
            verificado=data.verificado,
            esta_activo=data.esta_activo,
        )

    return _to_public(user)

def delete_user(db: Session, current: Usuario, user_id: int) -> dict:
    if not _is_admin(current):
        raise HTTPException(status_code=403, detail="No autorizado")
    if current.id_usuario == user_id:
        raise HTTPException(status_code=400, detail="No puedes desactivar tu propio usuario")

    user = repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    repo.soft_delete_user(db, user)
    return {"detail": "Usuario desactivado."}
