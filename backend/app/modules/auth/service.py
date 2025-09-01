import os
import uuid
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.modules.auth import repository as repo
from app.modules.auth.model import Usuario
from app.modules.auth.schemas import (
    UserCreate, UserLogin, UserPublic, TokenOut, UserUpdate, map_role_db_to_public,
    AccessTokenOnly, RefreshIn, LogoutIn, SimpleMsg,
    VerifyEmailIn, ResendVerificationIn, ForgotPasswordIn, ResetPasswordIn,
    ChangePasswordIn, PushTokenIn
)

# =========================
# Configuración tokens extra
# =========================
JWT_ALG = os.getenv("JWT_ALG", "HS256")

REFRESH_SECRET = os.getenv("REFRESH_SECRET_KEY", "CHANGE_ME_REFRESH_SECRET")
ACTION_SECRET  = os.getenv("ACTION_SECRET_KEY", "CHANGE_ME_ACTION_SECRET")

ACCESS_EXPIRE_MINUTES  = int(os.getenv("ACCESS_EXPIRE_MINUTES", "30"))
REFRESH_EXPIRE_DAYS    = int(os.getenv("REFRESH_EXPIRE_DAYS", "7"))
VERIFY_EXPIRE_HOURS    = int(os.getenv("VERIFY_EXPIRE_HOURS", "24"))
RESET_EXPIRE_MINUTES   = int(os.getenv("RESET_EXPIRE_MINUTES", "30"))

REVOKED_JTIS: set[str] = set()  # revocación en memoria (si necesitas persistente -> tabla/Redis)

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

# =========================
# Servicios existentes
# =========================
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

# =========================
# Nuevos servicios (faltantes)
# =========================

# ---- Refresh ----
def _create_refresh_token(user: Usuario) -> str:
    exp = _now_utc() + timedelta(days=REFRESH_EXPIRE_DAYS)
    payload = {
        "sub": str(user.id_usuario),
        "role": user.rol,
        "type": "refresh",
        "jti": uuid.uuid4().hex,
        "iat": int(_now_utc().timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, REFRESH_SECRET, algorithm=JWT_ALG)

def _decode_refresh(token: str) -> dict:
    data = jwt.decode(token, REFRESH_SECRET, algorithms=[JWT_ALG])
    if data.get("type") != "refresh":
        raise JWTError("Tipo inválido")
    jti = data.get("jti")
    if jti in REVOKED_JTIS:
        raise JWTError("Token revocado")
    return data

def refresh_access(db: Session, payload: RefreshIn) -> AccessTokenOnly:
    try:
        data = _decode_refresh(payload.refresh_token)
        uid = int(data["sub"])
        user = repo.get_by_id(db, uid)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        access = create_access_token(user.id_usuario, extra={"role": user.rol})
        return AccessTokenOnly(access_token=access)
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"refresh inválido: {e}")

def logout(payload: LogoutIn) -> SimpleMsg:
    if payload.refresh_token:
        try:
            data = jwt.decode(payload.refresh_token, REFRESH_SECRET, algorithms=[JWT_ALG])
            jti = data.get("jti")
            if jti:
                REVOKED_JTIS.add(jti)
        except JWTError:
            # si ya está vencido o inválido, no hacemos nada crítico
            pass
    return SimpleMsg(detail="Sesión cerrada.")

# ---- Verify email / resend ----
def verify_email(db: Session, body: VerifyEmailIn) -> SimpleMsg:
    try:
        data = jwt.decode(body.token, ACTION_SECRET, algorithms=[JWT_ALG])
        if data.get("type") != "action" or data.get("purpose") != "verify_email":
            raise JWTError("Propósito inválido")
        uid = int(data["sub"])
        user = repo.get_by_id(db, uid)
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        if user.verificado:
            return SimpleMsg(detail="Correo ya estaba verificado.")
        repo.mark_email_verified(db, user)
        return SimpleMsg(detail="Correo verificado exitosamente.")
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Token inválido: {e}")

def resend_verification(db: Session, body: ResendVerificationIn) -> SimpleMsg:
    user = repo.get_by_email(db, body.email.strip().lower())
    # Mensaje genérico para no revelar existencia
    generic = "Si la cuenta existe, se envió un correo de verificación."
    if not user:
        return SimpleMsg(detail=generic)
    if user.verificado:
        return SimpleMsg(detail="Tu correo ya está verificado.")
    exp = _now_utc() + timedelta(hours=VERIFY_EXPIRE_HOURS)
    payload = {
        "sub": str(user.id_usuario),
        "type": "action",
        "purpose": "verify_email",
        "iat": int(_now_utc().timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, ACTION_SECRET, algorithm=JWT_ALG)
    # En producción: enviar email. Para QA devolvemos el token:
    return SimpleMsg(detail=f"{generic} token={token}")

# ---- Forgot / Reset password ----
def forgot_password(db: Session, body: ForgotPasswordIn) -> SimpleMsg:
    user = repo.get_by_email(db, body.email.strip().lower())
    generic = "Si la cuenta existe, se envió un correo para restablecer."
    if not user:
        return SimpleMsg(detail=generic)
    # versionamos el token con el hash actual para invalidar si ya cambió
    exp = _now_utc() + timedelta(minutes=RESET_EXPIRE_MINUTES)
    payload = {
        "sub": str(user.id_usuario),
        "type": "action",
        "purpose": "reset_password",
        "ver": _sha256(user.hashed_password),
        "iat": int(_now_utc().timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, ACTION_SECRET, algorithm=JWT_ALG)
    return SimpleMsg(detail=f"{generic} token={token}")

def reset_password(db: Session, body: ResetPasswordIn) -> TokenOut:
    # 1) sacar user_id
    try:
        raw = jwt.decode(body.token, ACTION_SECRET, algorithms=[JWT_ALG])
        if raw.get("type") != "action" or raw.get("purpose") != "reset_password":
            raise JWTError("Propósito inválido")
        uid = int(raw["sub"])
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Token inválido: {e}")

    user = repo.get_by_id(db, uid)
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # 2) validar versión con hash actual
    try:
        data = jwt.decode(body.token, ACTION_SECRET, algorithms=[JWT_ALG])
        if data.get("ver") != _sha256(user.hashed_password):
            raise JWTError("Token desactualizado")
    except JWTError as e:
        raise HTTPException(status_code=400, detail=f"Token inválido: {e}")

    # 3) actualizar contraseña
    new_hash = hash_password(body.new_password)
    user = repo.update_password_hash(db, user, new_hash)

    # 4) emitir nuevo access para iniciar sesión al tiro
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

# ---- Cambiar mi contraseña ----
def change_my_password(db: Session, user: Usuario, body: ChangePasswordIn) -> SimpleMsg:
    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if body.current_password == body.new_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña no puede ser igual a la actual")
    new_hash = hash_password(body.new_password)
    repo.update_password_hash(db, user, new_hash)
    return SimpleMsg(detail="Contraseña actualizada.")

# ---- Registrar push token ----
def register_push_token(db: Session, user: Usuario, body: PushTokenIn) -> SimpleMsg:
    repo.save_push_token(db, user, body.token, body.platform)
    return SimpleMsg(detail="Token de notificaciones actualizado.")
