from typing import Annotated
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.media.schemas import MediaTarget, ReorderIn, SetPrincipalOut, MediaListOut
from app.modules.media.service import upload_media, list_media, delete_media, set_principal, bulk_reorder

router = APIRouter(prefix="/media", tags=["media"])

def _norm_target(t: str) -> MediaTarget:
    t = (t or "").strip().lower()
    if t in ("perfil", "cancha", "complejo"):
        return t  # type: ignore[return-value]
    raise HTTPException(status_code=422, detail="target debe ser 'perfil', 'cancha' o 'complejo'")

@router.post("", response_model=int, summary="Sube imagen y crea registro en medios")
def create_media(
    target: Annotated[str, Form(description="perfil | cancha | complejo")],
    target_id: Annotated[int, Form()],
    es_principal: Annotated[bool, Form()] = False,
    orden: Annotated[int, Form()] = 0,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("usuario","dueno","admin","superadmin")),
):
    t = _norm_target(target)
    return upload_media(db, target=t, target_id=target_id, file=file, es_principal=es_principal, orden=orden)

@router.get("", response_model=MediaListOut, summary="Lista imágenes por target y id")
def get_media(
    target: str,
    target_id: int,
    db: Session = Depends(get_db),
):
    t = _norm_target(target)
    items = list_media(db, target=t, target_id=target_id)
    return {"items": items}

@router.post("/{id_media}/principal", response_model=SetPrincipalOut, summary="Marca como principal")
def mark_principal(
    id_media: int,
    target: str,
    target_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("usuario","dueno","admin","superadmin")),
):
    t = _norm_target(target)
    set_principal(db, target=t, target_id=target_id, id_media=id_media)
    return {"ok": True}
