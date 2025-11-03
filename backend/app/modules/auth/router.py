from fastapi import APIRouter, Depends, Request 
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.schemas import (
    UserCreate, UserLogin, TokenOut, UserPublic, UserUpdate,
    AccessTokenOnly, RefreshIn, LogoutIn, SimpleMsg,
    VerifyEmailIn, ResendVerificationIn, ForgotPasswordIn, ResetPasswordIn,
    ChangePasswordIn, PushTokenIn, UserCreate, TokenOut, RegisterInitOut, VerifyEmailWithTokenIn
)
from app.modules.auth.service import (
    register as svc_register,
    login as svc_login,
    me as svc_me,
    update_me as svc_update_me,
    refresh_access as svc_refresh_access,
    logout as svc_logout,
    verify_email as svc_verify_email,
    resend_verification as svc_resend_verification,
    forgot_password as svc_forgot_password,
    reset_password as svc_reset_password,
    change_my_password as svc_change_my_password,
    register_push_token as svc_register_push_token,
)
from app.modules.auth.service import (
    register_init_stateless, register_verify_stateless,
)
from app.modules.auth.model import Usuario

# Mantén el nombre del tag "auth" para que coincida con openapi_tags de main.py
router = APIRouter(prefix="/auth", tags=["auth"])

# ----- Pre-registro stateless -----

@router.post(
    "/register/init",
    response_model=RegisterInitOut,
    summary="Inicio de registro (stateless)",
    description="Envía un OTP al email y devuelve un action_token firmado (no crea el usuario todavía)."
)
def register_init_stateless_endpoint(
    payload: UserCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return register_init_stateless(db, payload, ip)

@router.post(
    "/register/verify",
    response_model=TokenOut,
    status_code=201,
    summary="Verificar OTP y crear usuario",
    description="Valida el action_token + OTP y recién crea el usuario verificado."
)
def register_verify_stateless_endpoint(
    payload: VerifyEmailWithTokenIn,
    request: Request,
    db: Session = Depends(get_db)
):
    ip = request.client.host if request.client else None
    return register_verify_stateless(db, payload, ip)


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=201,
    summary="Registrarse",
    description="Crea un nuevo usuario con email y contraseña. Retorna un **token de acceso** (Bearer) y el **perfil** del usuario.",
    response_description="Token de acceso y perfil del usuario registrado."
)
def register_endpoint(payload: UserCreate, db: Session = Depends(get_db)):
    return svc_register(db, payload)

@router.post(
    "/login",
    response_model=TokenOut,
    summary="Iniciar sesión",
    description="Autentica con **email y contraseña**. Retorna un **token de acceso** (Bearer) y el **perfil** del usuario.",
    response_description="Token de acceso y perfil del usuario autenticado."
)
def login_endpoint(payload: UserLogin, db: Session = Depends(get_db)):
    return svc_login(db, payload)

@router.get(
    "/me",
    response_model=UserPublic,
    summary="Mi perfil",
    description="Devuelve el **perfil** del usuario autenticado (requiere `Authorization: Bearer <token>`).",
    response_description="Perfil público del usuario autenticado."
)
def me_endpoint(current: Usuario = Depends(get_current_user)):
    return svc_me(current)

@router.patch(
    "/me",
    response_model=UserPublic,
    summary="Actualizar mi perfil",
    description="Edita campos básicos del perfil (nombre, apellido, teléfono, avatar). Requiere estar autenticado.",
    response_description="Perfil actualizado."
)
def update_me_endpoint(
    payload: UserUpdate,
    current: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc_update_me(db, current, payload)

@router.patch(
    "/me/password",
    response_model=SimpleMsg,
    summary="Cambiar mi contraseña",
    description="Cambia la contraseña actual por una nueva. Requiere enviar **contraseña actual** y **nueva contraseña**.",
    response_description="Mensaje de confirmación de cambio de contraseña."
)
def change_my_password_endpoint(
    payload: ChangePasswordIn,
    current: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc_change_my_password(db, current, payload)

@router.post(
    "/me/push-token",
    response_model=SimpleMsg,
    summary="Registrar token de notificaciones",
    description="Registra o actualiza el **token FCM** del dispositivo para recibir notificaciones push.",
    response_description="Mensaje de confirmación de registro de token."
)
def register_push_token_endpoint(
    payload: PushTokenIn,
    current: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc_register_push_token(db, current, payload)

@router.post(
    "/refresh",
    response_model=AccessTokenOnly,
    summary="Refrescar token de acceso",
    description="Genera un **nuevo access token** a partir de un **refresh token** válido.",
    response_description="Nuevo token de acceso (Bearer)."
)
def refresh_endpoint(payload: RefreshIn, db: Session = Depends(get_db)):
    return svc_refresh_access(db, payload)

@router.post(
    "/logout",
    response_model=SimpleMsg,
    summary="Cerrar sesión",
    description="Revoca el **refresh token** (si se envía) y cierra la sesión en el dispositivo actual.",
    response_description="Mensaje de cierre de sesión."
)
def logout_endpoint(payload: LogoutIn):
    return svc_logout(payload)


@router.post(
    "/send-verification",
    response_model=SimpleMsg,
    summary="Enviar código de verificación",
    description="Genera y envía un código de verificación al correo (aplica cooldown para evitar spam).",
    response_description="Mensaje indicando que se envió el código."
)
def send_verification_endpoint(payload: ResendVerificationIn, db: Session = Depends(get_db)):
    # reutiliza el servicio existente
    svc_resend_verification(db, payload.email)
    return {"message": "Si el correo existe y no estaba verificado, se envió el código de verificación."}

@router.post(
    "/resend-verification",
    response_model=SimpleMsg,
    summary="Reenviar verificación de correo",
)
def resend_verification_endpoint(payload: ResendVerificationIn, db: Session = Depends(get_db)):
    svc_resend_verification(db, payload.email)
    return {"message": "Si el correo existe y no estaba verificado, se envió un nuevo código."}

@router.post(
    "/verify-email",
    response_model=SimpleMsg,
    summary="Verificar correo",
)
def verify_email_endpoint(payload: VerifyEmailIn, db: Session = Depends(get_db)):
    svc_verify_email(db, payload.email, payload.code)
    return {"message": "Correo verificado correctamente."}

@router.post(
    "/forgot-password",
    response_model=SimpleMsg,
    summary="Olvidé mi contraseña (solicitar reset)",
)
def forgot_password_endpoint(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    svc_forgot_password(db, payload.email)
    return {"message": "Si el correo existe, te enviamos un código para restablecer la contraseña."}

@router.post(
    "/reset-password",
    response_model=SimpleMsg,   # <- cambia a SimpleMsg
    summary="Restablecer contraseña con token",
)
def reset_password_endpoint(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    svc_reset_password(db, payload.email, payload.code, payload.new_password)
    return {"message": "Contraseña actualizada correctamente."}