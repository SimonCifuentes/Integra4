from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class BloqueoCreate(BaseModel):
    id_cancha: int = Field(..., ge=1)            # <-- solo por cancha
    inicio: datetime                             # TIMESTAMPTZ
    fin: datetime
    motivo: Optional[str] = None

class BloqueoOut(BloqueoCreate):
    id_bloqueo: int
