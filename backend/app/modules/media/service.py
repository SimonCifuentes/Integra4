# app/modules/media/service.py
import uuid
import imghdr
from typing import Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session

# ✅ Usamos los helpers nuevos del config
from app.core.r2_config import s3, public_url, bucket_for_target
from app.modules.media.repository import MediaRepository
from app.modules.media.schemas import MediaTarget


ALLOWED_MIME = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
}

def _norm_target_service(t: str) -> MediaTarget:
    t = (t or "").strip().lower()
    if t in ("perfil", "cancha", "complejo"):
        return t  # type: ignore[return-value]
    raise HTTPException(status_code=422, detail="target inválido")

def _detect_ext(content: bytes) -> str:
    """Detecta extensión a partir del contenido si el MIME viene raro."""
    kind = imghdr.what(None, h=content)
    if kind == "jpeg":
        return "jpg"
    return kind or "bin"

def upload_media(
    db: Session,
    *,
    target: MediaTarget | str,
    target_id: int,
    file: UploadFile,
    es_principal: bool,
    orden: int,
) -> int:
    # normaliza target por si llega str
    target = _norm_target_service(str(target))

    # Validación de tipo
    if file.content_type not in ALLOWED_MIME:
        # Leer unos bytes para detectar tipo
        content = file.file.read()
        file.file.seek(0)
        ext = _detect_ext(content)
        if ext not in {"jpg", "png", "webp"}:
            raise HTTPException(status_code=415, detail="Formato de imagen no soportado")
        guessed_ext = ext
        content_type = {
            "jpg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
        }.get(ext, "application/octet-stream")
    else:
        guessed_ext = ALLOWED_MIME[file.content_type]
        content_type = file.content_type or "application/octet-stream"

    # Bucket correcto según target
    bucket = bucket_for_target(target)
    object_key = f"{target}/{target_id}/{uuid.uuid4().hex}.{guessed_ext}"

    # Subir a R2
    s3.upload_fileobj(
        Fileobj=file.file,
        Bucket=bucket,
        Key=object_key,
        ExtraArgs={"ContentType": content_type},
    )

    # URL pública navegable (si el bucket tiene r2.dev configurado)
    url = public_url(bucket, object_key)

    # Persistir registro en BD
    repo = MediaRepository(db)
    new_id = repo.insert_media(
        target=target,
        target_id=target_id,
        bucket=bucket,
        object_key=object_key,
        url_publica=url,
        es_principal=es_principal,
        orden=orden,
        metadata_json={"filename": file.filename, "content_type": content_type},
    )
    return new_id

def list_media(db: Session, *, target: MediaTarget, target_id: int) -> list[dict]:
    repo = MediaRepository(db)
    return repo.list_by_target(target, target_id)

def delete_media(db: Session, id_media: int) -> bool:
    repo = MediaRepository(db)
    row = repo.get_by_id(id_media)
    if not row:
        return False
    # Borrar en R2 (ignorar error si ya no existe)
    try:
        s3.delete_object(Bucket=row["bucket"], Key=row["object_key"])
    except Exception:
        pass
    return bool(repo.delete_media(id_media))

def set_principal(db: Session, *, target: MediaTarget, target_id: int, id_media: int) -> None:
    MediaRepository(db).set_principal(target, target_id, id_media)

def bulk_reorder(db: Session, pairs: list[tuple[int, int]]) -> None:
    MediaRepository(db).bulk_reorder(pairs)
