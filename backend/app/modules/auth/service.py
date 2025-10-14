import uuid
import hashlib

# app/modules/auth/service.py
import os, secrets, string

from app.core.mailer import send_verification_code, send_reset_code
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
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "15"))
OTP_MAX_ATTEMPTS   = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
RESEND_COOLDOWN    = int(os.getenv("RESEND_COOLDOWN_SECONDS", "60"))

JWT_ALG = os.getenv("JWT_ALG", "HS256")

REFRESH_SECRET = os.getenv("REFRESH_SECRET_KEY", "CHANGE_ME_REFRESH_SECRET")
ACTION_SECRET  = os.getenv("ACTION_SECRET_KEY", "CHANGE_ME_ACTION_SECRET")

ACCESS_EXPIRE_MINUTES  = int(os.getenv("ACCESS_EXPIRE_MINUTES", "30"))
REFRESH_EXPIRE_DAYS    = int(os.getenv("REFRESH_EXPIRE_DAYS", "7"))
VERIFY_EXPIRE_HOURS    = int(os.getenv("VERIFY_EXPIRE_HOURS", "24"))
RESET_EXPIRE_MINUTES   = int(os.getenv("RESET_EXPIRE_MINUTES", "30"))

REVOKED_JTIS: set[str] = set()  # revocación en memoria (si necesitas persistente -> tabla/Redis)
def _now():
    return datetime.now(timezone.utc)

def _generate_code(length=6) -> str:
    # solo dígitos o alfanumérico; tu columna soporta hasta 12
    digits = string.digits
    return "".join(secrets.choice(digits) for _ in range(length))

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

def resend_verification(db: Session, email: str) -> None:
    user = repo.get_user_by_email(db, email)
    if not user:
        # No revelamos si existe
        return
    if user.verificado:
        return

    if user.verification_last_sent and (_now() - user.verification_last_sent).total_seconds() < RESEND_COOLDOWN:
        raise HTTPException(status_code=429, detail="Debes esperar antes de reenviar el código.")

    code = _generate_code(6)
    expires_at = _now() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    repo.set_verification_code(db, user, code, expires_at)

    # envía correo (usa tu mailer con plantilla)
    send_verification_code(to=email, code=code, minutes=OTP_EXPIRE_MINUTES)

def verify_email(db: Session, email: str, code: str) -> None:
    user = repo.get_user_by_email(db, email)
    if not user:
        # no revelamos existencia
        return
    if user.verificado:
        return

    if user.verification_expires_at is None or _now() > user.verification_expires_at:
        raise HTTPException(status_code=400, detail="El código ha expirado. Solicita uno nuevo.")

    if (user.verification_attempts or 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Has superado el número de intentos permitidos.")

    if code != (user.verification_code or ""):
        repo.inc_verification_attempt(db, user)
        raise HTTPException(status_code=400, detail="Código inválido.")

    # OK
    repo.mark_verified(db, user)

# =============== RESET DE CONTRASEÑA ===============

def forgot_password(db: Session, email: str) -> None:
    user = repo.get_user_by_email(db, email)
    if not user:
        # silenciar para no filtrar existencia
        return

    if user.reset_last_sent and (_now() - user.reset_last_sent).total_seconds() < RESEND_COOLDOWN:
        raise HTTPException(status_code=429, detail="Debes esperar antes de solicitar otro código.")

    code = _generate_code(6)
    expires_at = _now() + timedelta(minutes=OTP_EXPIRE_MINUTES)
    repo.set_reset_code(db, user, code, expires_at)

    send_reset_code(to=email, code=code, minutes=OTP_EXPIRE_MINUTES)

def reset_password(db: Session, email: str, code: str, new_password: str) -> None:
    user = repo.get_user_by_email(db, email)
    if not user:
        return

    if user.reset_expires_at is None or _now() > user.reset_expires_at:
        raise HTTPException(status_code=400, detail="El código ha expirado. Genera uno nuevo.")

    if (user.reset_attempts or 0) >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Has superado el número de intentos permitidos.")

    if code != (user.reset_code or ""):
        repo.inc_reset_attempt(db, user)
        raise HTTPException(status_code=400, detail="Código inválido.")

    repo.update_password(db, user, hash_password(new_password))
    # 3) actualizar contraseña
    # 👇 aquí estaba el error
    new_hash = hash_password(new_password)
    repo.update_password(db, user, new_hash)
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
