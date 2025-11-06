from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, Literal, Any

MediaTarget = Literal["perfil", "cancha", "complejo"]

class MediaCreateIn(BaseModel):
    target: MediaTarget
    target_id: int = Field(..., ge=1)
    es_principal: bool = False
    orden: int = 0

class MediaOut(BaseModel):
    id_media: int
    target: MediaTarget
    id_complejo: Optional[int]
    id_cancha: Optional[int]
    id_usuario: Optional[int]
    bucket: str
    object_key: str
    url_publica: Optional[HttpUrl]
    es_principal: bool
    orden: int
    metadata: Optional[dict[str, Any]] = None

class MediaListOut(BaseModel):
    items: list[MediaOut]

class ReorderIn(BaseModel):
    id_media: int
    orden: int

class SetPrincipalOut(BaseModel):
    ok: bool
