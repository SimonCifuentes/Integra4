from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.model import Usuario
from app.modules.uploads.schemas import PresignIn, PresignOut, UploadOut, DeleteOut
from app.modules.uploads.service import presign as svc_presign, upload_local as svc_upload_local, delete_media as svc_delete

router = APIRouter(prefix="/uploads", tags=["uploads"])

@router.post(
    "/presign",
    response_model=PresignOut,
    summary="URL firmada para subir (S3/GCS)",
    description=(
        "Devuelve una **URL firmada (PUT)** para subir un archivo a **S3** o **GCS**. "
        "Si `provider` no se envía, usa `STORAGE_PROVIDER` de entorno (por defecto `local`). "
        "En `local`, no se requiere presign y devuelve un `media_id` y una ruta base."
    ),
    response_description="Datos de la URL firmada y media_id."
)
def presign_endpoint(
    payload: PresignIn,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_presign(db, current, payload)

@router.post(
    "",
    response_model=UploadOut,
    summary="Subida directa (local/dev)",
    description=(
        "Sube el archivo **directamente** al sistema de archivos local (modo desarrollo). "
        "Para producción, usa `/uploads/presign` con S3/GCS desde el frontend."
    ),
    response_description="Información del archivo subido."
)
def upload_endpoint(
    file: UploadFile = File(..., description="Archivo a subir"),
    folder: str = Form(default="uploads/"),
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_upload_local(db, current, file, folder)

@router.delete(
    "/{media_id}",
    response_model=DeleteOut,
    summary="Eliminar archivo",
    description=(
        "Elimina el archivo indicado por `media_id`. "
        "Requiere ser **owner** del archivo o **admin/superadmin**. "
        "Funciona para `local`, `s3` y `gcs`."
    ),
    response_description="Confirmación de eliminación."
)
def delete_endpoint(
    media_id: str,
    db: Session = Depends(get_db),
    current: Usuario = Depends(get_current_user),
):
    return svc_delete(db, current, media_id)
