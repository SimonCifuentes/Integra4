from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.modules.auth.model import Usuario

def get_by_email(db: Session, email: str) -> Usuario | None:
    # case-insensitive (por si tu columna no es CITEXT)
    stmt = select(Usuario).where(func.lower(Usuario.email) == email.lower())
    return db.execute(stmt).scalar_one_or_none()

def get_by_id(db: Session, user_id: int) -> Usuario | None:
    stmt = select(Usuario).where(Usuario.id_usuario == user_id)
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

# ============ NUEVO ============

def mark_email_verified(db: Session, user: Usuario) -> Usuario:
    # tu modelo usa 'verificado' como booleano
    user.verificado = True
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def update_password_hash(db: Session, user: Usuario, new_hash: str) -> Usuario:
    user.hashed_password = new_hash
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def save_push_token(db: Session, user: Usuario, token: str, platform: Optional[str]) -> None:
    """
    Persistencia del FCM token. Si tu modelo `Usuario` tiene un campo tipo `push_token` o `fcm_token`,
    lo actualizamos ahí. En caso contrario, hacemos no-op (queda lista para migrar a una tabla de dispositivos).
    """
    updated = False
    if hasattr(user, "push_token"):
        setattr(user, "push_token", token)
        updated = True
    elif hasattr(user, "fcm_token"):
        setattr(user, "fcm_token", token)
        updated = True
    # Si quieres auditar por plataforma, y existe la columna:
    if platform and hasattr(user, "push_platform"):
        setattr(user, "push_platform", platform)
        updated = True

    if updated:
        db.add(user)
        db.commit()
        db.refresh(user)
