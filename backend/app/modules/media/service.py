# app/modules/media/service.py
import uuid
import imghdr
from typing import Optional

from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.r2_config import s3, public_url, bucket_for_target
from app.modules.media.repository import MediaRepository
from app.modules.media.schemas import MediaTarget
from app.modules.auth.model import Usuario

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


# 🔐 ---------- PERMISOS ----------

def _check_can_edit_target(
    db: Session,
    user: Usuario,
    *,
    target: MediaTarget,
    target_id: int,
) -> None:
    """
    Reglas:

    - superadmin: puede todo.
    - admin / dueno:
        - pueden editar SOLO sus complejos y canchas (donde son id_dueno).
        - perfil: solo su propio perfil.
    - usuario:
        - solo puede editar SU perfil.
    """

    # 1) SUPERADMIN → todo permitido
    if user.rol == "superadmin":
        return

    # 2) PERFIL → solo dueño de ese perfil (excepto superadmin, cubierto arriba)
    if target == "perfil":
        if user.id_usuario != target_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No puedes modificar la foto de otro usuario",
            )
        return

    # Desde aquí hablamos de COMPLEJO / CANCHA
    # admin y dueno pueden editar SOLO si son id_dueno;
    # usuario normal nunca pasa (bloqueado por require_roles), pero igual validamos.

    # 3) COMPLEJO → solo si es dueño del complejo
    if target == "complejo":
        sql = text(
            """
            SELECT 1
            FROM complejos
            WHERE id_complejo = :cid
              AND id_dueno    = :uid
            """
        )
        row = db.execute(sql, {"cid": target_id, "uid": user.id_usuario}).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No eres dueño de este complejo",
            )
        return

    # 4) CANCHA → solo si es dueño del complejo de esa cancha
    if target == "cancha":
        sql = text(
            """
            SELECT 1
            FROM canchas c
            JOIN complejos co ON co.id_complejo = c.id_complejo
            WHERE c.id_cancha = :id
              AND co.id_dueno = :uid
            """
        )
        row = db.execute(sql, {"id": target_id, "uid": user.id_usuario}).first()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No eres dueño de esta cancha",
            )
        return

    # Cualquier cosa rara
    raise HTTPException(status_code=422, detail="target inválido")


def _build_object_key(target: MediaTarget, target_id: int, guessed_ext: str) -> str:
    return f"{target}/{target_id}/{uuid.uuid4().hex}.{guessed_ext}"


# ---------- USE CASES ----------

def upload_media(
    db: Session,
    *,
    target: MediaTarget | str,
    target_id: int,
    file: UploadFile,
    es_principal: bool,
    orden: int,
    user: Usuario,
) -> int:
    # normaliza target por si llega str
    target = _norm_target_service(str(target))

    # 🔐 chequeo de permisos
    _check_can_edit_target(db, user, target=target, target_id=target_id)

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
    object_key = _build_object_key(target, target_id, guessed_ext)

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
    return list(repo.list_by_target(target, target_id))


def delete_media(db: Session, *, id_media: int, user: Usuario) -> bool:
    repo = MediaRepository(db)
    row = repo.get_by_id(id_media)
    if not row:
        return False

    # target + id del recurso al que pertenece
    target: MediaTarget = row["target"]
    if target == "perfil":
        target_id = row["id_usuario"]
    elif target == "complejo":
        target_id = row["id_complejo"]
    else:
        target_id = row["id_cancha"]

    _check_can_edit_target(db, user, target=target, target_id=target_id)

    # Borrar en R2 (ignorar error si ya no existe)
    try:
        s3.delete_object(Bucket=row["bucket"], Key=row["object_key"])
    except Exception:
        pass

    deleted = repo.delete_media(id_media)
    return bool(deleted)


def set_principal(
    db: Session,
    *,
    target: MediaTarget,
    target_id: int,
    id_media: int,
    user: Usuario,
) -> None:
    # 🔐 permisos a nivel de recurso
    _check_can_edit_target(db, user, target=target, target_id=target_id)

    repo = MediaRepository(db)
    row = repo.get_by_id(id_media)
    if not row or row["target"] != target:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    # chequeo de consistencia id del recurso
    if target == "perfil" and row["id_usuario"] != target_id:
        raise HTTPException(status_code=400, detail="La imagen no pertenece a ese perfil")
    if target == "complejo" and row["id_complejo"] != target_id:
        raise HTTPException(status_code=400, detail="La imagen no pertenece a ese complejo")
    if target == "cancha" and row["id_cancha"] != target_id:
        raise HTTPException(status_code=400, detail="La imagen no pertenece a esa cancha")

    repo.set_principal(target, target_id, id_media)


def bulk_reorder(
    db: Session,
    *,
    target: MediaTarget,
    target_id: int,
    pairs: list[tuple[int, int]],
    user: Usuario,
) -> None:
    """
    Reordena varias imágenes del mismo recurso (target/target_id).
    pairs = [(id_media, nuevo_orden), ...]
    """
    if not pairs:
        return

    _check_can_edit_target(db, user, target=target, target_id=target_id)

    repo = MediaRepository(db)

    # Validar que todas las imágenes pertenecen al mismo recurso
    for id_media, _ in pairs:
        row = repo.get_by_id(id_media)
        if not row or row["target"] != target:
            raise HTTPException(status_code=400, detail="Todas las imágenes deben ser del mismo target")

        if target == "perfil" and row["id_usuario"] != target_id:
            raise HTTPException(status_code=400, detail="Imagen no corresponde al perfil indicado")
        if target == "complejo" and row["id_complejo"] != target_id:
            raise HTTPException(status_code=400, detail="Imagen no corresponde al complejo indicado")
        if target == "cancha" and row["id_cancha"] != target_id:
            raise HTTPException(status_code=400, detail="Imagen no corresponde a la cancha indicada")

    repo.bulk_reorder(pairs)


# 🔁 ---------- REEMPLAZAR IMAGEN (cambiar foto) ----------

def replace_media_file(
    db: Session,
    *,
    id_media: int,
    file: UploadFile,
    user: Usuario,
) -> dict:
    repo = MediaRepository(db)
    row = repo.get_by_id(id_media)
    if not row:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    target: MediaTarget = row["target"]
    if target == "perfil":
        target_id = row["id_usuario"]
    elif target == "complejo":
        target_id = row["id_complejo"]
    else:
        target_id = row["id_cancha"]

    _check_can_edit_target(db, user, target=target, target_id=target_id)

    # Validar tipo (igual que upload)
    if file.content_type not in ALLOWED_MIME:
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

    bucket = row["bucket"]  # reutilizamos mismo bucket
    object_key = _build_object_key(target, target_id, guessed_ext)

    # Subir nuevo archivo
    s3.upload_fileobj(
        Fileobj=file.file,
        Bucket=bucket,
        Key=object_key,
        ExtraArgs={"ContentType": content_type},
    )

    # Borrar archivo viejo en R2 (opcional pero recomendable)
    try:
        s3.delete_object(Bucket=row["bucket"], Key=row["object_key"])
    except Exception:
        pass

    url = public_url(bucket, object_key)

    updated = repo.update_media_file(
        id_media,
        bucket=bucket,
        object_key=object_key,
        url_publica=url,
        metadata_json={"filename": file.filename, "content_type": content_type},
    )
    if not updated:
        raise HTTPException(status_code=500, detail="No se pudo actualizar la imagen")

    return updated
