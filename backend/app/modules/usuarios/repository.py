from typing import List, Tuple, Optional
from sqlalchemy import select, func, asc, desc
from sqlalchemy.orm import Session

from app.modules.auth.model import Usuario  # reutilizamos el modelo

def get_by_id(db: Session, user_id: int) -> Usuario | None:
    stmt = select(Usuario).where(Usuario.id_usuario == user_id)
    return db.execute(stmt).scalar_one_or_none()

def search_users(
    db: Session,
    *,
    q: Optional[str],
    rol: Optional[str],
    activo: Optional[bool],
    verificado: Optional[bool],
    order_by: str,
    order: str,
    offset: int,
    limit: int,
) -> Tuple[List[Usuario], int]:
    stmt = select(Usuario)

    if q:
        q_like = f"%{q.lower()}%"
        stmt = stmt.where(
            func.lower(Usuario.nombre).like(q_like) |
            func.lower(Usuario.apellido).like(q_like) |
            func.lower(Usuario.email).like(q_like)
        )

    if rol:
        stmt = stmt.where(Usuario.rol == rol)

    if activo is not None:
        stmt = stmt.where(Usuario.esta_activo == activo)

    if verificado is not None:
        stmt = stmt.where(Usuario.verificado == verificado)

    # Orden
    colmap = {
        "id_usuario": Usuario.id_usuario,
        "nombre": Usuario.nombre,
        "apellido": Usuario.apellido,
        "email": Usuario.email,
    }
    col = colmap.get(order_by, Usuario.id_usuario)
    stmt = stmt.order_by(asc(col) if order == "asc" else desc(col))

    # Total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Paginación
    stmt = stmt.offset(offset).limit(limit)

    rows = db.execute(stmt).scalars().all()
    return rows, total

def update_user_admin(
    db: Session,
    user: Usuario,
    *,
    nombre: Optional[str],
    apellido: Optional[str],
    telefono: Optional[str],
    avatar_url: Optional[str],
    rol: Optional[str],
    verificado: Optional[bool],
    esta_activo: Optional[bool],
) -> Usuario:
    # Campos base
    if nombre is not None:
        user.nombre = nombre
    if apellido is not None:
        user.apellido = apellido
    if telefono is not None:
        user.telefono = telefono
    if avatar_url is not None:
        user.avatar_url = avatar_url
    # Solo admin
    if rol is not None:
        user.rol = rol
    if verificado is not None:
        user.verificado = verificado
    if esta_activo is not None:
        user.esta_activo = esta_activo

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_user_self(
    db: Session,
    user: Usuario,
    *,
    nombre: Optional[str],
    apellido: Optional[str],
    telefono: Optional[str],
    avatar_url: Optional[str],
) -> Usuario:
    if nombre is not None:
        user.nombre = nombre
    if apellido is not None:
        user.apellido = apellido
    if telefono is not None:
        user.telefono = telefono
    if avatar_url is not None:
        user.avatar_url = avatar_url

    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def soft_delete_user(db: Session, user: Usuario) -> Usuario:
    user.esta_activo = False
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def set_user_role(db: Session, user: Usuario, rol: str) -> Usuario:
    user.rol = rol
    db.add(user); db.commit(); db.refresh(user)
    return user
