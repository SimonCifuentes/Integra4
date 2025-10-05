from pydantic import BaseModel, EmailStr, Field
from pydantic import AliasChoices
from typing import Optional, Literal

def map_role_db_to_public(db_value: str) -> str:
    # Mapea roles de BD -> API pública (3 roles que usas):
    return {
        "usuario": "usuario",
        "dueno": "admin",          # dueño del complejo
        "admin": "super_admin",    # global
        "superadmin": "super_admin"
    }.get(db_value, "usuario")

# =========================
# Modelos existentes
# =========================
class UserPublic(BaseModel):
    id_usuario: int
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    rol: Literal["usuario", "admin", "super_admin"]

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    # acepta "email" o "correo"
    email: EmailStr = Field(validation_alias=AliasChoices("email", "correo"))
    password: str = Field(min_length=6, max_length=128)
    telefono: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr = Field(validation_alias=AliasChoices("email", "correo"))
    password: str

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic

class UserUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    apellido: Optional[str] = Field(default=None, min_length=1, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=30)
    avatar_url: Optional[str] = Field(default=None, max_length=512)

# =========================
# Nuevos modelos (faltantes)
# =========================
class AccessTokenOnly(BaseModel):
    access_token: str
    token_type: str = "bearer"

class RefreshIn(BaseModel):
    refresh_token: str = Field(..., min_length=20)

class LogoutIn(BaseModel):
    refresh_token: Optional[str] = Field(None, min_length=20)

class SimpleMsg(BaseModel):
    message: str

# --- Verificación de correo ---
class ResendVerificationIn(BaseModel):
    email: EmailStr

class VerifyEmailIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)

# --- Reset de contraseña ---
class ForgotPasswordIn(BaseModel):
    email: EmailStr

class ResetPasswordIn(BaseModel):
    email: EmailStr
    code: str = Field(min_length=4, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)

class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)

class PushTokenIn(BaseModel):
    token: str = Field(min_length=20)
    platform: Optional[Literal["android", "ios", "web"]] = "android"
