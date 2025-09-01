from __future__ import annotations
import os, uuid, mimetypes
from pathlib import Path
from typing import Dict, Optional, Tuple, Literal

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.modules.auth.model import Usuario
from app.modules.uploads.schemas import PresignIn, PresignOut, UploadOut, DeleteOut
from app.modules.uploads import repository as repo

# =========================
# Helpers de provider
# =========================
def _provider_from_env() -> str:
    return os.getenv("STORAGE_PROVIDER", "local").lower()

def _build_media_id(provider: str, bucket: Optional[str], key: str) -> str:
    # Formato: provider:bucket/key  (en local: "local:/ruta/relativa")
    if provider == "local":
        return f"local:{key}"
    bucket_part = bucket or ""
    return f"{provider}:{bucket_part}/{key}"

def _parse_media_id(media_id: str) -> Tuple[str, Optional[str], str]:
    """
    Devuelve (provider, bucket, key)
    Ejemplos:
      local:uploads/uuid_foto.png -> ("local", None, "uploads/uuid_foto.png")
      s3:mi-bucket/uploads/foto.png -> ("s3", "mi-bucket", "uploads/foto.png")
      gcs:mi-bucket/uploads/foto.png -> ("gcs", "mi-bucket", "uploads/foto.png")
    """
    if ":" not in media_id:
        raise HTTPException(status_code=400, detail="media_id inválido")
    provider, rest = media_id.split(":", 1)
    if provider == "local":
        return "local", None, rest.lstrip("/")
    if "/" not in rest:
        raise HTTPException(status_code=400, detail="media_id inválido")
    bucket, key = rest.split("/", 1)
    return provider, bucket, key

# =========================
# Presign (S3/GCS)
# =========================
def _presign_s3(filename: str, content_type: Optional[str], folder: str) -> PresignOut:
    try:
        import boto3  # type: ignore
    except Exception:
        raise HTTPException(status_code=501, detail="S3 no disponible. Instala boto3 y configura credenciales.")

    bucket = os.getenv("S3_BUCKET")
    region = os.getenv("S3_REGION", "us-east-1")
    if not bucket:
        raise HTTPException(status_code=500, detail="Falta S3_BUCKET en entorno")

    key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}_{repo.sanitize_filename(filename)}".lstrip("/")
    content_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    s3 = boto3.client("s3", region_name=region)
    # URL firmada para PUT
    upload_url = s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=int(os.getenv("S3_PRESIGN_EXPIRES", "3600")),
        HttpMethod="PUT",
    )
    public_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
    media_id = _build_media_id("s3", bucket, key)
    return PresignOut(media_id=media_id, upload_url=upload_url, headers={"Content-Type": content_type}, public_url=public_url)

def _presign_gcs(filename: str, content_type: Optional[str], folder: str) -> PresignOut:
    try:
        from google.cloud import storage  # type: ignore
        from google.auth.transport.requests import Request  # noqa: F401
    except Exception:
        raise HTTPException(status_code=501, detail="GCS no disponible. Instala google-cloud-storage y configura credenciales.")

    bucket_name = os.getenv("GCS_BUCKET")
    if not bucket_name:
        raise HTTPException(status_code=500, detail="Falta GCS_BUCKET en entorno")

    key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}_{repo.sanitize_filename(filename)}".lstrip("/")
    content_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"

    client = storage.Client()  # usa GOOGLE_APPLICATION_CREDENTIALS
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(key)

    expires = int(os.getenv("GCS_PRESIGN_EXPIRES", "3600"))
    # Signed URL para PUT
    upload_url = blob.generate_signed_url(
        expiration=expires,
        method="PUT",
        content_type=content_type,
    )

    public_url = f"https://storage.googleapis.com/{bucket_name}/{key}"
    media_id = _build_media_id("gcs", bucket_name, key)
    return PresignOut(media_id=media_id, upload_url=upload_url, headers={"Content-Type": content_type}, public_url=public_url)

def presign(db: Session, current: Usuario, data: PresignIn) -> PresignOut:
    provider = (data.provider or _provider_from_env()).lower()
    folder = data.folder or "uploads/"
    if provider == "s3":
        out = _presign_s3(data.filename, data.content_type, folder)
    elif provider == "gcs":
        out = _presign_gcs(data.filename, data.content_type, folder)
    else:
        # Para local no hace falta presign; devolvemos un pseudo-URL y media_id local
        key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}_{repo.sanitize_filename(data.filename)}".lstrip("/")
        media_id = _build_media_id("local", None, key)
        public_url = f"/{key}"  # si montas estáticos, quedará accesible
        out = PresignOut(media_id=media_id, upload_url=public_url, headers={}, public_url=public_url)

    # Registramos placeholder en el índice (dueño/propietario del medio)
    repo.add_record(out.media_id, {
        "owner_user_id": int(current.id_usuario),
        "provider": provider,
        "original_name": data.filename,
        "content_type": data.content_type,
        "status": "presigned",
        "path_or_key": out.public_url or out.upload_url,
        "created_at": int(__import__("time").time()),
    })
    return out

# =========================
# Subida directa (LOCAL)
# =========================
def upload_local(db: Session, current: Usuario, file: UploadFile, folder: Optional[str]) -> UploadOut:
    provider = "local"
    folder = folder or "uploads/"
    repo.ensure_dirs()
    safe_name = repo.sanitize_filename(file.filename or "file.bin")
    key = f"{folder.rstrip('/')}/{uuid.uuid4().hex}_{safe_name}".lstrip("/")
    abs_path = (repo.DEFAULT_BASE_DIR / key).resolve()
    abs_path.parent.mkdir(parents=True, exist_ok=True)

    # Guardar contenido
    size = 0
    with abs_path.open("wb") as f:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)

    media_id = _build_media_id(provider, None, key)
    url = f"/{key}"  # si montas estáticos, quedará accesible
    repo.add_record(media_id, {
        "owner_user_id": int(current.id_usuario),
        "provider": provider,
        "original_name": file.filename,
        "content_type": file.content_type,
        "status": "stored",
        "path_or_key": str(abs_path),
        "public_url": url,
        "size": size,
        "created_at": int(__import__("time").time()),
    })
    return UploadOut(media_id=media_id, url=url, size=size, content_type=file.content_type)

# =========================
# Eliminar
# =========================
def _can_admin(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin")

def delete_media(db: Session, current: Usuario, media_id: str) -> DeleteOut:
    provider, bucket, key = _parse_media_id(media_id)
    rec = repo.get_record(media_id)
    if rec:
        owner_id = int(rec.get("owner_user_id", 0))
        if current.id_usuario != owner_id and not _can_admin(current):
            raise HTTPException(status_code=403, detail="No autorizado para eliminar este archivo")

    # Ejecutar eliminación física según provider
    if provider == "local":
        abs_path = repo.DEFAULT_BASE_DIR / key
        try:
            if abs_path.exists():
                abs_path.unlink()
        except Exception:
            # si falla, igual retiramos del índice para evitar zombies
            pass
        repo.del_record(media_id)
        return DeleteOut(detail="Archivo eliminado (local).")

    elif provider == "s3":
        try:
            import boto3  # type: ignore
        except Exception:
            raise HTTPException(status_code=501, detail="S3 no disponible para borrar. Instala boto3.")
        if not bucket:
            raise HTTPException(status_code=400, detail="media_id inválido (bucket faltante)")
        s3 = boto3.client("s3", region_name=os.getenv("S3_REGION", "us-east-1"))
        s3.delete_object(Bucket=bucket, Key=key)
        repo.del_record(media_id)
        return DeleteOut(detail="Archivo eliminado (S3).")

    elif provider == "gcs":
        try:
            from google.cloud import storage  # type: ignore
        except Exception:
            raise HTTPException(status_code=501, detail="GCS no disponible para borrar. Instala google-cloud-storage.")
        if not bucket:
            raise HTTPException(status_code=400, detail="media_id inválido (bucket faltante)")
        client = storage.Client()
        b = client.bucket(bucket)
        blob = b.blob(key)
        blob.delete()
        repo.del_record(media_id)
        return DeleteOut(detail="Archivo eliminado (GCS).")

    else:
        raise HTTPException(status_code=400, detail="Proveedor desconocido")
