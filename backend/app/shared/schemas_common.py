from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

class RoleEnum(str, Enum):
    usuario = "usuario"
    dueno = "dueno"
    admin = "admin"
    superadmin = "superadmin"

class Pagination(BaseModel):
    page: int = Field(1, ge=1)
    limit: int = Field(10, ge=1, le=100)
