from pydantic import BaseModel
from typing import Literal

class SetRolIn(BaseModel):
    rol: Literal["usuario","dueno","admin","superadmin"]
