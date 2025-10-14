from pydantic import BaseModel
from typing import Literal

class SetRolIn(BaseModel):
    # usar en el endpoint de “promover”
    rol: Literal["admin", "superadmin"]

class DemoteRolIn(BaseModel):
    # usar en el endpoint de “bajar”
    rol: Literal["admin", "usuario"]
