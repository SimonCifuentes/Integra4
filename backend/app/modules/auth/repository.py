from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.modules.auth.model import Usuario

def get_by_email(db: Session, email: str) -> Usuario | None:
    # case-insensitive (por si tu columna no es CITEXT)
    stmt = select(Usuario).where(func.lower(Usuario.email) == email.lower())
    return db.execute(stmt).scalar_one_or_none()

def create_user(
    db: Session, *, nombre: str | None, apellido: str | None, email: str,
    hashed_password: str, telefono: str | None = None
) -> Usuario:
    user = Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email,
        hashed_password=hashed_password,
        telefono=telefono,
        rol="usuario",
        verificado=False,
        esta_activo=True,
    )
    db.add(user)
    db.flush()
    return user

def update_user_me(
    db: Session,
    user: Usuario,
    *, nombre: Optional[str], apellido: Optional[str],
    telefono: Optional[str], avatar_url: Optional[str]
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
