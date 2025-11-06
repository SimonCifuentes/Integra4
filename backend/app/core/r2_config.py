# app/core/r2_config.py
from __future__ import annotations

import os
from typing import Optional, Literal
import boto3
from botocore.config import Config
from botocore.client import BaseClient

# ============
# Variables .env
# ============

R2_ACCOUNT_ID: str | None        = os.getenv("R2_ACCOUNT_ID")
R2_ENDPOINT: str | None          = os.getenv("R2_ENDPOINT")  # https://<account>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID: str | None     = os.getenv("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY: str | None = os.getenv("R2_SECRET_ACCESS_KEY")

# Buckets
R2_BUCKET_MEDIA: str    = os.getenv("R2_BUCKET_MEDIA", "sporthub-media")
R2_BUCKET_CANCHAS: str  = os.getenv("R2_BUCKET_CANCHAS", "imgcanchas")
R2_BUCKET_PERFILES: str = os.getenv("R2_BUCKET_PERFILES", "imgperfil")

# (OPCIONAL) Base global tipo cloudflarestorage.com/<bucket>/<key>
R2_PUBLIC_BASE_URL_GLOBAL: str = os.getenv("R2_PUBLIC_BASE_URL", "").strip()

# Bases por bucket (r2.dev) — PON AQUÍ tus r2.dev
R2_PUBLIC_BASE_IMGCANCHAS: str      = os.getenv("R2_PUBLIC_BASE_IMGCANCHAS", "").strip()
R2_PUBLIC_BASE_IMGPERFIL: str       = os.getenv("R2_PUBLIC_BASE_IMGPERFIL", "").strip()
R2_PUBLIC_BASE_SPORTHUB_MEDIA: str  = os.getenv("R2_PUBLIC_BASE_SPORTHUB_MEDIA", "").strip()

# ============
# Cliente S3 (Cloudflare R2)
# ============

_s3_config = Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"})

def _require_env(name: str, value: Optional[str]) -> str:
    if not value:
        raise RuntimeError(f"Config R2: falta variable de entorno {name}")
    return value

# Validación mínima al cargar el módulo (falla rápido si algo clave falta)
_ENDPOINT = _require_env("R2_ENDPOINT", R2_ENDPOINT)
_ACCESS   = _require_env("R2_ACCESS_KEY_ID", R2_ACCESS_KEY_ID)
_SECRET   = _require_env("R2_SECRET_ACCESS_KEY", R2_SECRET_ACCESS_KEY)

s3: BaseClient = boto3.client(
    "s3",
    endpoint_url=_ENDPOINT,
    aws_access_key_id=_ACCESS,
    aws_secret_access_key=_SECRET,
    region_name="auto",
    config=_s3_config,
)

# ============
# Helpers de URL pública
# ============

def public_url(bucket: str, key: str) -> Optional[str]:
    """
    Devuelve una URL pública navegable para un objeto, si hay base configurada.
    Prioridad:
      1) Base r2.dev por bucket (recomendada)
      2) Base global (cloudflarestorage.com)
      3) None (si nada está configurado)
    """
    per_bucket = {
        R2_BUCKET_CANCHAS:  R2_PUBLIC_BASE_IMGCANCHAS.rstrip("/") if R2_PUBLIC_BASE_IMGCANCHAS else "",
        R2_BUCKET_PERFILES: R2_PUBLIC_BASE_IMGPERFIL.rstrip("/") if R2_PUBLIC_BASE_IMGPERFIL else "",
        R2_BUCKET_MEDIA:    R2_PUBLIC_BASE_SPORTHUB_MEDIA.rstrip("/") if R2_PUBLIC_BASE_SPORTHUB_MEDIA else "",
    }.get(bucket, "")

    if per_bucket:
        return f"{per_bucket}/{key}"

    base = R2_PUBLIC_BASE_URL_GLOBAL.rstrip("/")
    if base:
        # Formato: https://<account>.r2.cloudflarestorage.com/<bucket>/<key>
        return f"{base}/{bucket}/{key}"

    return None

MediaTarget = Literal["perfil", "cancha", "complejo"]

def bucket_for_target(target: MediaTarget) -> str:
    """
    Mapea 'perfil'|'cancha'|'complejo' al bucket correspondiente.
    """
    if target == "perfil":
        return R2_BUCKET_PERFILES
    if target == "cancha":
        return R2_BUCKET_CANCHAS
    # por defecto, 'complejo' u otros medios generales
    return R2_BUCKET_MEDIA

# ============
# Presigned URLs (para buckets privados)
# ============

def presigned_get_url(bucket: str, key: str, expires: int = 300) -> str:
    """
    URL temporal (GET) para descargar/ver un objeto privado.
    """
    return s3.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )

def presigned_put_url(bucket: str, key: str, content_type: str, expires: int = 300) -> str:
    """
    URL temporal (PUT) para subir directamente desde frontend sin pasar por el backend.
    """
    return s3.generate_presigned_url(
        ClientMethod="put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires,
    )

# ============
# Utilidades de subida/borrado (si quieres usarlas desde servicios)
# ============

def upload_fileobj(bucket: str, key: str, fileobj, content_type: Optional[str] = None, public: bool = False) -> None:
    """
    Sube un archivo desde un file-like object (UploadFile.file) a R2.
    Nota: Cloudflare R2 ignora ACL=public-read en modo 'URL pública de desarrollo';
          el acceso público depende de que hayas habilitado r2.dev para ese bucket.
    """
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    # Mantener privado; el flag 'public' es informativo por si luego quieres cambiar políticas.
    s3.upload_fileobj(Fileobj=fileobj, Bucket=bucket, Key=key, ExtraArgs=extra)

def delete_object(bucket: str, key: str) -> None:
    """
    Borra un objeto (ignora error si no existe).
    """
    try:
        s3.delete_object(Bucket=bucket, Key=key)
    except Exception:
        # no romper el flujo si el objeto ya no está
        pass
