from typing import Optional, Literal, List
from pydantic import BaseModel, Field, EmailStr

# === Salidas ===
class UsuarioBaseOut(BaseModel):
    id_usuario: int
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    email: EmailStr
    telefono: Optional[str] = None
    avatar_url: Optional[str] = None
    rol: Literal["usuario", "admin", "super_admin"]
    verificado: Optional[bool] = None
    esta_activo: Optional[bool] = None

class UsuarioDetailOut(UsuarioBaseOut):
    pass

class UsuariosListOut(BaseModel):
    items: List[UsuarioBaseOut]
    total: int
    page: int
    page_size: int

# === Filtros de entrada (query) ===
class UsuariosQuery(BaseModel):
    q: Optional[str] = Field(default=None, description="Búsqueda por nombre, apellido o email")
    rol: Optional[Literal["usuario", "dueno", "admin", "superadmin"]] = None
    activo: Optional[bool] = Field(default=None, description="Filtrar por usuarios activos/inactivos")
    verificado: Optional[bool] = Field(default=None, description="Filtrar por verificación de correo")
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
    order_by: Optional[Literal["id_usuario", "nombre", "apellido", "email"]] = "id_usuario"
    order: Optional[Literal["asc", "desc"]] = "asc"

# === Actualización (admin o el propio) ===
class UsuarioUpdateIn(BaseModel):
    # Campos que cualquiera puede actualizar (también disponibles para admin)
    nombre: Optional[str] = Field(default=None, min_length=1, max_length=120)
    apellido: Optional[str] = Field(default=None, min_length=1, max_length=120)
    telefono: Optional[str] = Field(default=None, max_length=30)
    avatar_url: Optional[str] = Field(default=None, max_length=512)

    # Campos solo para admin/superadmin
    rol: Optional[Literal["usuario", "dueno", "admin", "superadmin"]] = None
    verificado: Optional[bool] = None
    esta_activo: Optional[bool] = None
