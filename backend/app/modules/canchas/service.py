from __future__ import annotations
from typing import Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.canchas.schemas import (
    CanchaCreateIn, CanchaUpdateIn, CanchasQuery, CanchaOut, CanchasListOut,
    CanchaFotoIn, CanchaFotoOut
)
from app.modules.canchas import repository as repo
from app.modules.auth.model import Usuario
from app.modules.complejos import repository as complejos_repo


def _is_admin(user: Usuario) -> bool:
    return user.rol in ("admin", "superadmin")


def list_canchas(db: Session, params: CanchasQuery) -> CanchasListOut:
    """
    Búsqueda/listado público de canchas con filtros, paginación y distancia opcional.
    """
    rows, total = repo.search_canchas(
        db,
        q=params.q,
        id_complejo=params.id_complejo,
        deporte=params.deporte,
        cubierta=params.cubierta,
        iluminacion=params.iluminacion,
        max_precio=params.max_precio,
        lat=params.lat, lon=params.lon, max_km=params.max_km,
        sort_by=params.sort_by or "nombre",
        order=params.order or "asc",
        offset=(params.page - 1) * params.page_size,
        limit=params.page_size,
    )
    items = [CanchaOut(**r) for r in rows]
    return CanchasListOut(items=items, total=total, page=params.page, page_size=params.page_size)


def create_cancha(db: Session, current: Usuario, data: CanchaCreateIn) -> CanchaOut:
    """
    Crea una cancha dentro de un complejo.
    - superadmin: siempre permitido
    - admin: permitido solo si es dueño (id_dueno) del complejo
    - usuario normal: prohibido
    """
    id_dueno = complejos_repo.owner_of_complejo(db, data.id_complejo)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")

    if current.rol == "superadmin":
        pass  # bypass total
    elif current.rol == "admin":
        if current.id_usuario != id_dueno:
            raise HTTPException(status_code=403, detail="No autorizado: el complejo no pertenece a este admin")
    else:
        raise HTTPException(status_code=403, detail="No autorizado para crear canchas")

    try:
        out = repo.insert_cancha(db, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return CanchaOut(**out)


def get_cancha(db: Session, id_cancha: int, lat: Optional[float], lon: Optional[float]) -> CanchaOut:
    """
    Detalle de cancha (público). Si se envía lat/lon, incluye distancia_km.
    """
    row = repo.get_cancha_by_id(db, id_cancha, lat=lat, lon=lon)
    if not row:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    return CanchaOut(**row)


def update_cancha(db: Session, id_cancha: int, current: Usuario, data: CanchaUpdateIn) -> CanchaOut:
    """
    Actualiza una cancha.
    - superadmin: siempre permitido
    - admin: permitido solo si es dueño del complejo al que pertenece la cancha
    - usuario normal: prohibido
    """
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    if current.rol == "superadmin":
        pass  # bypass total
    elif current.rol == "admin":
        if current.id_usuario != id_dueno:
            raise HTTPException(status_code=403, detail="No autorizado para editar esta cancha")
    else:
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        row = repo.update_cancha(db, id_cancha, data.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not row:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    return CanchaOut(**row)


def delete_cancha(db: Session, id_cancha: int, current: Usuario) -> dict:
    """
    Desactiva (soft delete) una cancha.
    - superadmin: siempre permitido
    - admin: permitido solo si es dueño del complejo al que pertenece la cancha
    - usuario normal: prohibido
    """
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    if current.rol == "superadmin":
        pass  # bypass total
    elif current.rol == "admin":
        if current.id_usuario != id_dueno:
            raise HTTPException(status_code=403, detail="No autorizado para eliminar esta cancha")
    else:
        raise HTTPException(status_code=403, detail="No autorizado")

    repo.soft_delete_cancha(db, id_cancha)
    return {"ok": True}


# ===== Fotos =====
def list_fotos(db: Session, id_cancha: int) -> list[CanchaFotoOut]:
    rows = repo.list_fotos_cancha(db, id_cancha)
    return [CanchaFotoOut(**r) for r in rows]


def add_foto(db: Session, id_cancha: int, current: Usuario, data: CanchaFotoIn) -> CanchaFotoOut:
    """
    Agrega una foto a la cancha.
    - superadmin: siempre permitido
    - admin: permitido solo si es dueño del complejo al que pertenece la cancha
    - usuario normal: prohibido
    """
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    if current.rol == "superadmin":
        pass  # bypass total
    elif current.rol == "admin":
        if current.id_usuario != id_dueno:
            raise HTTPException(status_code=403, detail="No autorizado para agregar fotos a esta cancha")
    else:
        raise HTTPException(status_code=403, detail="No autorizado")

    row = repo.add_foto_cancha(db, id_cancha, data.url_foto, data.orden)
    return CanchaFotoOut(**row)


def delete_foto(db: Session, id_cancha: int, id_foto: int, current: Usuario) -> dict:
    """
    Elimina una foto de la cancha.
    - superadmin: siempre permitido
    - admin: permitido solo si es dueño del complejo al que pertenece la cancha
    - usuario normal: prohibido
    """
    id_dueno = repo.owner_of_cancha(db, id_cancha)
    if id_dueno is None:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")

    if current.rol == "superadmin":
        pass  # bypass total
    elif current.rol == "admin":
        if current.id_usuario != id_dueno:
            raise HTTPException(status_code=403, detail="No autorizado para eliminar fotos de esta cancha")
    else:
        raise HTTPException(status_code=403, detail="No autorizado")

    repo.delete_foto_cancha(db, id_cancha, id_foto)
    return {"ok": True}
