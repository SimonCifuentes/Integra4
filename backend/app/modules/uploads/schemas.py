from __future__ import annotations
from typing import Optional, Dict, Literal
from pydantic import BaseModel, Field

StorageProvider = Literal["local", "s3", "gcs"]

class PresignIn(BaseModel):
    filename: str = Field(..., description="Nombre de archivo original, ej: foto.jpg")
    content_type: Optional[str] = Field(default="application/octet-stream")
    folder: Optional[str] = Field(default="uploads/", description="Prefijo/carpeta destino")
    provider: Optional[StorageProvider] = Field(default=None, description="local | s3 | gcs (si omites, toma de env)")

class PresignOut(BaseModel):
    media_id: str = Field(..., description="Identificador lógico usado luego para borrar")
    upload_url: str = Field(..., description="URL firmada donde subir el archivo (PUT)")
    method: Literal["PUT"] = "PUT"
    headers: Dict[str, str] = Field(default_factory=dict, description="Headers que debes enviar en la subida")
    public_url: Optional[str] = Field(default=None, description="URL pública (si aplica)")

class UploadOut(BaseModel):
    media_id: str
    url: str
    size: int
    content_type: Optional[str] = None

class DeleteOut(BaseModel):
    detail: str
