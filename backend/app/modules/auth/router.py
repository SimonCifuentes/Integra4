from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.schemas import (
    UserCreate, UserLogin, TokenOut, UserPublic, UserUpdate,
    AccessTokenOnly, RefreshIn, LogoutIn, SimpleMsg,
    VerifyEmailIn, ResendVerificationIn, ForgotPasswordIn, ResetPasswordIn,
    ChangePasswordIn, PushTokenIn
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
from app.modules.auth.model import Usuario

# Mantén el nombre del tag "auth" para que coincida con openapi_tags de main.py
router = APIRouter(prefix="/auth", tags=["auth"])

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
    "/resend-verification",
    response_model=SimpleMsg,
    summary="Reenviar verificación de correo",
    description="Envía nuevamente el correo de **verificación de cuenta**. En entorno de pruebas, retorna el token en el mensaje.",
    response_description="Mensaje indicando que se envió la verificación."
)
def resend_verification_endpoint(payload: ResendVerificationIn, db: Session = Depends(get_db)):
    return svc_resend_verification(db, payload)

@router.post(
    "/verify-email",
    response_model=SimpleMsg,
    summary="Verificar correo",
    description="Confirma el **correo electrónico** usando el **token de verificación**.",
    response_description="Mensaje indicando que el correo fue verificado."
)
def verify_email_endpoint(payload: VerifyEmailIn, db: Session = Depends(get_db)):
    return svc_verify_email(db, payload)

@router.post(
    "/forgot-password",
    response_model=SimpleMsg,
    summary="Olvidé mi contraseña (solicitar reset)",
    description="Genera un **token de restablecimiento** y envía instrucciones al correo. En pruebas, retorna el token en el mensaje.",
    response_description="Mensaje indicando que se enviaron instrucciones de restablecimiento."
)
def forgot_password_endpoint(payload: ForgotPasswordIn, db: Session = Depends(get_db)):
    return svc_forgot_password(db, payload)

@router.post(
    "/reset-password",
    response_model=TokenOut,
    summary="Restablecer contraseña con token",
    description="Cambia la contraseña usando un **token de restablecimiento** válido y retorna un **token de acceso** + **perfil**.",
    response_description="Token de acceso y perfil del usuario con la nueva contraseña."
)
def reset_password_endpoint(payload: ResetPasswordIn, db: Session = Depends(get_db)):
    return svc_reset_password(db, payload)
