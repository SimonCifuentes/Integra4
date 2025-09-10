from __future__ import annotations
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.canchas.schemas import (
    CanchaCreateIn, CanchaUpdateIn, CanchasQuery, CanchaOut, CanchasListOut, CanchaFotoIn, CanchaFotoOut
)
from app.modules.canchas import repository as repo
from app.modules.auth.model import Usuario
from app.modules.complejos import repository as complejos_repo

def _is_admin(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin")

def list_canchas(db: Session, params: CanchasQuery) -> CanchasListOut:
    rows, total = repo.search_canchas(
        db,
        q=params.q,
        id_complejo=params.id_complejo,
        deporte=params.deporte,
        cubierta=params.cubierta,
        iluminacion=params.iluminacion,  # <-- NUEVO
        max_precio=params.max_precio,
        lat=params.lat, lon=params.lon, max_km=params.max_km,
        sort_by=params.sort_by or "nombre",
        order=params.order or "asc",
        offset=(params.page-1)*params.page_size,
        limit=params.page_size,
    )
    items = [CanchaOut(**r) for r in rows]
    return CanchasListOut(items=items, total=total, page=params.page, page_size=params.page_size)

def create_cancha(db: Session, current: Usuario, data: CanchaCreateIn) -> CanchaOut:
    # permiso: dueño del complejo o admin
    id_dueno = complejos_repo.owner_of_complejo(db, data.id_complejo)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    if not (_is_admin(current) or current.id_usuario == id_dueno):
        raise HTTPException(status_code=403, detail="No autorizado para crear canchas en este complejo")

    try:
        out = repo.insert_cancha(db, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CanchaOut(**out)

def get_cancha(db: Session, id_cancha: int, lat: Optional[float], lon: Optional[float]) -> CanchaOut:
    row = repo.get_cancha_by_id(db, id_cancha, lat=lat, lon=lon)
    if not row:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return CanchaOut(**row)

def update_cancha(db: Session, id_cancha: int, current: Usuario, data: CanchaUpdateIn) -> CanchaOut:
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not (_is_admin(current) or current.id_usuario == id_dueno):
        raise HTTPException(status_code=403, detail="No autorizado para editar esta cancha")

    try:
        row = repo.update_cancha(db, id_cancha, data.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not row:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return CanchaOut(**row)

def delete_cancha(db: Session, id_cancha: int, current: Usuario) -> dict:
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not (_is_admin(current) or current.id_usuario == id_dueno):
        raise HTTPException(status_code=403, detail="No autorizado para eliminar esta cancha")
    repo.soft_delete_cancha(db, id_cancha)
    return {"ok": True}

# ===== Fotos =====
def list_fotos(db: Session, id_cancha: int) -> list[CanchaFotoOut]:
    rows = repo.list_fotos_cancha(db, id_cancha)
    return [CanchaFotoOut(**r) for r in rows]

def add_foto(db: Session, id_cancha: int, current: Usuario, data: CanchaFotoIn) -> CanchaFotoOut:
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not (_is_admin(current) or current.id_usuario == id_dueno):
        raise HTTPException(status_code=403, detail="No autorizado para agregar fotos a esta cancha")

    row = repo.add_foto_cancha(db, id_cancha, data.url_foto, data.orden)
    return CanchaFotoOut(**row)

def delete_foto(db: Session, id_cancha: int, id_foto: int, current: Usuario) -> dict:
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    if not (_is_admin(current) or current.id_usuario == id_dueno):
        raise HTTPException(status_code=403, detail="No autorizado para eliminar fotos de esta cancha")

    repo.delete_foto_cancha(db, id_cancha, id_foto)
    return {"ok": True}
