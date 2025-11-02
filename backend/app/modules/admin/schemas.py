from pydantic import BaseModel
from typing import Literal
from typing import Optional, List

class SetRolIn(BaseModel):
    # usar en el endpoint de “promover”
    rol: Literal["admin", "superadmin"]

class DemoteRolIn(BaseModel):
    # usar en el endpoint de “bajar”
    rol: Literal["admin", "usuario"]

class AdminMeOut(BaseModel):
    id_usuario: int
    rol: str
    email: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None

class ComplejoMiniOut(BaseModel):
    id_complejo: int
    nombre: str
    direccion: Optional[str] = None
    comuna: Optional[str] = None
    activo: bool

class AdminItem(BaseModel):
    id_usuario: int
    rol: str
    email: str
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None

class AdminSearchOut(BaseModel):
    items: List[AdminItem]
    total: int
    page: int
    page_size: int