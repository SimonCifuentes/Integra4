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
    return user.rol in ("admin", "superadmin")


def _is_owner_or_admin(user: Usuario, owner_id: int) -> bool:
    return _is_admin(user) or user.id_usuario == owner_id


def list_complejos(db: Session, q: ComplejosQuery) -> ComplejosListOut:
    """
    Lógica de búsqueda/nearby:

    - Modo BOUNDS (nuevo):
        Se usan ne_lat, ne_lon, sw_lat, sw_lon (todas presentes).
        Esto representa el rectángulo visible del mapa (viewport).
        PRIORIDAD MÁS ALTA.

    - Modo RADIO:
        Si NO hay bounds, pero sí lat/lon/max_km, se usa un radio en km
        alrededor de (lat, lon).

    - Modo LISTA:
        Si no hay ni bounds ni radio, se devuelven complejos según filtros
        (q, comuna, id_comuna, deporte...) sin restricción espacial.

    Pasos:
    - Normaliza bounds a {north,south,east,west}
    - Decide si usamos radio
    - Llama al repositorio con esa info
    - Empaqueta la respuesta en ComplejosListOut
    """

    # 1. Paginación
    offset = (q.page - 1) * q.page_size
    limit = q.page_size

    # 2. Detectar si llegaron bounds completos
    has_bounds = all([
        q.ne_lat is not None,
        q.ne_lon is not None,
        q.sw_lat is not None,
        q.sw_lon is not None,
    ])

    bounds = None
    if has_bounds:
        # normalizamos por si vienen invertidos
        north = max(q.ne_lat, q.sw_lat)
        south = min(q.ne_lat, q.sw_lat)
        east  = max(q.ne_lon, q.sw_lon)
        west  = min(q.ne_lon, q.sw_lon)

        # chequeo rápido para evitar un rectángulo degenerado
        if north == south or east == west:
            raise HTTPException(status_code=400, detail="Bounds inválidos")

        bounds = {
            "north": north,
            "south": south,
            "east":  east,
            "west":  west,
        }

    # 3. Marcar si usamos radio (solo si NO hay bounds)
    use_radius = (
        not has_bounds
        and q.lat is not None
        and q.lon is not None
        and q.max_km is not None
    )

    # 4. Ir al repositorio
    #    El repo debe exponer list_complejos(db, params, bounds, use_radius, offset, limit)
    rows, total = repo.list_complejos(
        db=db,
        params=q,
        bounds=bounds,
        use_radius=use_radius,
        offset=offset,
        limit=limit,
    )

    # 5. Adaptar a modelos Pydantic de salida
    items = [ComplejoOut(**r) for r in rows]

    return ComplejosListOut(
        items=items,
        total=total,
        page=q.page,
        page_size=q.page_size
    )


def create_complejo(db: Session, current: Usuario, data: ComplejoCreateIn) -> ComplejoOut:
    if current.rol not in ("dueno", "admin", "superadmin"):
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
    row = repo.get_complejo_by_id(db, id_complejo, lat=lat, lon=lon)
    if not row:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    return ComplejoOut(**row)


def update_complejo(db: Session, current: Usuario, id_complejo: int, data: ComplejoUpdateIn) -> ComplejoOut:
    owner_id = repo.owner_of_complejo(db, id_complejo)
    if not owner_id:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    if not _is_owner_or_admin(current, owner_id):
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
    owner_id = repo.owner_of_complejo(db, id_complejo)
    if not owner_id:
        raise HTTPException(status_code=404, detail="Complejo no encontrado")
    if not _is_owner_or_admin(current, owner_id):
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
    # si no mandan rango, usamos últimos 30 días
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
        id_complejo=id_complejo,
        desde=desde,
        hasta=hasta,
        reservas_confirmadas=int(kpis["reservas_confirmadas"]),
        horas_reservadas=float(kpis["horas_reservadas"]),
        ingresos_confirmados=float(kpis["ingresos_confirmados"]),
        ocupacion=float(kpis["ocupacion"])
    )
