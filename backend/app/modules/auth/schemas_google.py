from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class GoogleAuthPayload(BaseModel):
    provider: str = Field(..., pattern="^google$")
    google_id: str = Field(..., min_length=3)
    email: EmailStr
    nombre: str
    apellido: str
    avatar_url: Optional[str] = None
