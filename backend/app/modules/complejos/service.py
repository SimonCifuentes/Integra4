from __future__ import annotations
from typing import Optional
from datetime import date, timedelta
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.modules.auth.model import Usuario
from app.modules.complejos.schemas import (
    ComplejosQuery, ComplejosListOut, ComplejoOut, ComplejoCreateIn, ComplejoUpdateIn,
    CanchaOut, HorarioOut, BloqueoOut, ResumenOut
)
from app.modules.complejos import repository as repo

def _is_admin(user: Usuario) -> bool:
    return user.rol in ("admin","superadmin")


def list_complejos(db: Session, q: ComplejosQuery) -> ComplejosListOut:
    offset = (q.page - 1) * q.page_size
    rows, total = repo.search_complejos(
        db,
        q=q.q, comuna=q.comuna, id_comuna=q.id_comuna, deporte=q.deporte,
        lat=q.lat, lon=q.lon, max_km=q.max_km,
        sort_by=q.sort_by or "nombre",
        order=q.order or "asc",
        offset=offset, limit=q.page_size
    )
    items = [ComplejoOut(**r) for r in rows]
    return ComplejosListOut(items=items, total=total, page=q.page, page_size=q.page_size)

def create_complejo(db: Session, current: Usuario, data: ComplejoCreateIn) -> ComplejoOut:
    """
    Crear complejo:
    - superadmin: permitido
    - admin: permitido (queda como id_dueno del complejo)
    - usuario normal: prohibido
    """
    if current.rol not in ("admin", "superadmin"):
        raise HTTPException(status_code=403, detail="No autorizado para crear complejos")
    try:
        row = repo.insert_complejo(db, current.id_usuario, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    row["rating_promedio"] = None
    row["total_resenas"] = 0
    row["distancia_km"] = None
    return ComplejoOut(**row)

def get_complejo(db: Session, id_complejo: int, lat: Optional[float], lon: Optional[float]) -> ComplejoOut:
    """
    Detalle de complejo (público). Si se envía lat/lon, incluye distancia_km.
    """
    row = repo.get_complejo_by_id(db, id_complejo, lat=lat, lon=lon)
    if not row:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    return ComplejoOut(**row)

def update_complejo(db: Session, current: Usuario, id_complejo: int, data: ComplejoUpdateIn) -> ComplejoOut:
    """
    Actualizar complejo:
    - superadmin: puede actualizar cualquiera
    - admin: solo si es el propietario (id_dueno) del complejo
    """
    owner_id = repo.owner_of_complejo(db, id_complejo)
    if not owner_id:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")

    if not (
        (current.rol == "superadmin") or
        (current.rol == "admin" and current.id_usuario == owner_id)
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    try:
        row = repo.update_complejo(db, id_complejo, data.model_dump(exclude_none=True))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not row:
        raise HTTPException(status_code=500, detail="No se pudo actualizar el complejo")

    reloaded = repo.get_complejo_by_id(db, id_complejo)
    return ComplejoOut(**reloaded)

def delete_complejo(db: Session, current: Usuario, id_complejo: int) -> dict:
    """
    Desactivar (soft delete) complejo:
    - superadmin: puede eliminar cualquiera
    - admin: solo si es el propietario (id_dueno)
    """
    owner_id = repo.owner_of_complejo(db, id_complejo)
    if not owner_id:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")

    if not (
        (current.rol == "superadmin") or
        (current.rol == "admin" and current.id_usuario == owner_id)
    ):
        raise HTTPException(status_code=403, detail="No autorizado")

    repo.soft_delete_complejo(db, id_complejo)
    return {"detail": "Complejo desactivado."}


def canchas(db: Session, id_complejo: int):
    return [CanchaOut(**r) for r in repo.list_canchas(db, id_complejo)]

def horarios(db: Session, id_complejo: int):
    return [HorarioOut(**r) for r in repo.list_horarios(db, id_complejo)]

def bloqueos(db: Session, id_complejo: int):
    return [BloqueoOut(**r) for r in repo.list_bloqueos(db, id_complejo)]

def resumen(db: Session, id_complejo: int, desde: Optional[str], hasta: Optional[str]) -> ResumenOut:
    if not desde or not hasta:
        h = date.today()
        d = h - timedelta(days=29)
        desde = desde or d.isoformat()
        hasta = hasta or h.isoformat()
    base = repo.get_complejo_by_id(db, id_complejo)
    if not base:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    kpis = repo.resumen_basico(db, id_complejo, desde, hasta)
    return ResumenOut(
        id_complejo=id_complejo, desde=desde, hasta=hasta,
        reservas_confirmadas=int(kpis["reservas_confirmadas"]),
        horas_reservadas=float(kpis["horas_reservadas"]),
        ingresos_confirmados=float(kpis["ingresos_confirmados"]),
        ocupacion=float(kpis["ocupacion"])
    )
