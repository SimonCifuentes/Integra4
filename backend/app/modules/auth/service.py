from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.modules.auth import repository as repo
from app.modules.auth.model import Usuario
from app.modules.auth.schemas import (
    UserCreate, UserLogin, UserPublic, TokenOut, UserUpdate, map_role_db_to_public
)

def register(db: Session, data: UserCreate) -> TokenOut:
    email_norm = data.email.strip().lower()
    if repo.get_by_email(db, email_norm):
        raise HTTPException(status_code=409, detail="El email ya está registrado")

    user = repo.create_user(
        db,
        nombre=data.nombre,
        apellido=data.apellido,
        email=email_norm,
        hashed_password=hash_password(data.password),
        telefono=data.telefono,
    )
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id_usuario, extra={"role": user.rol})
    return TokenOut(
        access_token=token,
        user=UserPublic(
            id_usuario=user.id_usuario,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            telefono=user.telefono,
            avatar_url=user.avatar_url,
            rol=map_role_db_to_public(user.rol),
        ),
    )

def login(db: Session, data: UserLogin) -> TokenOut:
    email_norm = data.email.strip().lower()
    user = repo.get_by_email(db, email_norm)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token(user.id_usuario, extra={"role": user.rol})
    return TokenOut(
        access_token=token,
        user=UserPublic(
            id_usuario=user.id_usuario,
            nombre=user.nombre,
            apellido=user.apellido,
            email=user.email,
            telefono=user.telefono,
            avatar_url=user.avatar_url,
            rol=map_role_db_to_public(user.rol),
        ),
    )

def me(user: Usuario) -> UserPublic:
    return UserPublic(
        id_usuario=user.id_usuario,
        nombre=user.nombre,
        apellido=user.apellido,
        email=user.email,
        telefono=user.telefono,
        avatar_url=user.avatar_url,
        rol=map_role_db_to_public(user.rol),
    )

def update_me(db: Session, user: Usuario, data: UserUpdate) -> UserPublic:
    updated = repo.update_user_me(
        db, user,
        nombre=data.nombre,
        apellido=data.apellido,
        telefono=data.telefono,
        avatar_url=data.avatar_url,
    )
    return UserPublic(
        id_usuario=updated.id_usuario,
        nombre=updated.nombre,
        apellido=updated.apellido,
        email=updated.email,
        telefono=updated.telefono,
        avatar_url=updated.avatar_url,
        rol=map_role_db_to_public(updated.rol),
    )
