from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

# ========== utilidades de esquema / ubicación ==========
def _has_postgis_loc(db: Session) -> bool:
    # detecta columna 'loc' en complejos
    q = text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='complejos' AND column_name='loc'
    """)
    return db.execute(q).first() is not None

def _resolve_deporte_id(db: Session, nombre: str) -> Optional[int]:
    r = db.execute(text("SELECT id_deporte FROM deportes WHERE lower(nombre)=:n"), {"n": nombre.lower()}).first()
    return int(r[0]) if r else None

# ========== consultas principales ==========
def search_canchas(
    db: Session,
    *,
    q: Optional[str],
    id_complejo: Optional[int],
    deporte: Optional[str],
    cubierta: Optional[bool],
    iluminacion: Optional[bool],  # <-- NUEVO
    max_precio: Optional[float],
    lat: Optional[float],
    lon: Optional[float],
    max_km: Optional[float],
    sort_by: str,
    order: str,
    offset: int,
    limit: int,
) -> Tuple[List[Dict[str, Any]], int]:
    params: Dict[str, Any] = {
        "q": f"%{q.lower()}%" if q else None,
        "id_complejo": id_complejo,
        "deporte": deporte.lower() if deporte else None,
        "cubierta": cubierta,
        "iluminacion": iluminacion,  # <-- NUEVO
        "max_precio": max_precio,
        "lat": lat, "lon": lon, "max_km": max_km,
        "offset": offset, "limit": limit,
    }

    # base con agregados (rating y precio mínimo vigente)
    base = """
        SELECT
          ch.id_cancha, ch.id_complejo, ch.nombre,
          d.nombre AS deporte,
          ch.cubierta, ch.activo,
          COALESCE(AVG(rs.puntuacion) FILTER (WHERE rs.esta_activa), NULL) AS rating_promedio,
          (
            SELECT MIN(rp.precio_por_hora)
            FROM reglas_precio rp
            WHERE rp.id_cancha = ch.id_cancha
              AND (rp.vigente_desde IS NULL OR rp.vigente_desde <= CURRENT_DATE)
              AND (rp.vigente_hasta IS NULL OR rp.vigente_hasta >= CURRENT_DATE)
          ) AS precio_desde
        FROM canchas ch
        JOIN deportes d   ON d.id_deporte = ch.id_deporte
        JOIN complejos c  ON c.id_complejo = ch.id_complejo
        LEFT JOIN resenas rs ON rs.id_cancha = ch.id_cancha
        WHERE ch.activo = TRUE AND c.activo = TRUE
    """

    wheres = []
    if q:
        wheres.append("lower(ch.nombre) LIKE :q")
    if id_complejo is not None:
        wheres.append("ch.id_complejo = :id_complejo")
    if deporte:
        wheres.append("lower(d.nombre) = :deporte")
    if cubierta is not None:
        wheres.append("ch.cubierta = :cubierta")
    if iluminacion is not None:
        # Requiere columna booleana ch.iluminacion
        wheres.append("ch.iluminacion = :iluminacion")

    if wheres:
        base += " AND " + " AND ".join(wheres)

    base += " GROUP BY ch.id_cancha, ch.id_complejo, ch.nombre, d.nombre, ch.cubierta, ch.activo"

    # distancia (en outer select para evitar GROUP BY extra)
    if lat is not None and lon is not None:
        if _has_postgis_loc(db):
            dist_expr = """
                CASE WHEN c.loc IS NOT NULL THEN
                    ST_Distance(c.loc, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)/1000.0
                ELSE NULL END
            """
        else:
            dist_expr = """
                CASE WHEN c.latitud IS NOT NULL AND c.longitud IS NOT NULL THEN
                  (6371 * acos(
                    cos(radians(:lat)) * cos(radians(c.latitud)) * cos(radians(c.longitud) - radians(:lon))
                    + sin(radians(:lat)) * sin(radians(c.latitud))
                  ))
                ELSE NULL END
            """
        final = f"""
            WITH base AS ({base})
            SELECT b.*,
                   {dist_expr} AS distancia_km
            FROM base b
            JOIN complejos c ON c.id_complejo = b.id_complejo
        """
    else:
        final = f"WITH base AS ({base}) SELECT b.*, NULL::numeric AS distancia_km FROM base b"

    # filtrar por precio máximo si se envió
    if max_precio is not None:
        final += " WHERE b.precio_desde IS NOT NULL AND b.precio_desde <= :max_precio"

    # filtro por cercanía
    if max_km is not None and lat is not None and lon is not None:
        final += " " + (" AND " if "WHERE" in final else " WHERE ") + " distancia_km <= :max_km"

    # orden
    ordermap = {
        "distancia": "distancia_km NULLS LAST",
        "precio": "precio_desde NULLS LAST",
        "rating": "rating_promedio NULLS LAST",
        "nombre": "nombre",
        "recientes": "id_cancha DESC"
    }
    ob = ordermap.get(sort_by, "nombre")
    direction = "ASC" if (order or "").lower() == "asc" else "DESC"
    final += f" ORDER BY {ob} {direction}"

    count_sql = f"SELECT count(*) FROM ({final}) t"
    total = db.execute(text(count_sql), params).scalar_one()

    final += " LIMIT :limit OFFSET :offset"
    rows = db.execute(text(final), params).mappings().all()
    return [dict(r) for r in rows], int(total)


def get_cancha_by_id(db: Session, id_cancha: int, *, lat: Optional[float]=None, lon: Optional[float]=None) -> Optional[Dict[str, Any]]:
    params = {"id": id_cancha, "lat": lat, "lon": lon}
    base = """
        SELECT
          ch.id_cancha, ch.id_complejo, ch.nombre,
          d.nombre AS deporte, ch.cubierta, ch.activo,
          COALESCE(AVG(rs.puntuacion) FILTER (WHERE rs.esta_activa), NULL) AS rating_promedio,
          (
            SELECT MIN(rp.precio_por_hora)
            FROM reglas_precio rp
            WHERE rp.id_cancha = ch.id_cancha
              AND (rp.vigente_desde IS NULL OR rp.vigente_desde <= CURRENT_DATE)
              AND (rp.vigente_hasta IS NULL OR rp.vigente_hasta >= CURRENT_DATE)
          ) AS precio_desde
        FROM canchas ch
        JOIN deportes d   ON d.id_deporte = ch.id_deporte
        JOIN complejos c  ON c.id_complejo = ch.id_complejo
        LEFT JOIN resenas rs ON rs.id_cancha = ch.id_cancha
        WHERE ch.id_cancha = :id
        GROUP BY ch.id_cancha, ch.id_complejo, ch.nombre, d.nombre, ch.cubierta, ch.activo
    """
    if lat is not None and lon is not None:
        if _has_postgis_loc(db):
            dist_expr = """
                CASE WHEN c.loc IS NOT NULL THEN
                    ST_Distance(c.loc, ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography)/1000.0
                ELSE NULL END
            """
        else:
            dist_expr = """
                CASE WHEN c.latitud IS NOT NULL AND c.longitud IS NOT NULL THEN
                  (6371 * acos(
                    cos(radians(:lat)) * cos(radians(c.latitud)) * cos(radians(c.longitud) - radians(:lon))
                    + sin(radians(:lat)) * sin(radians(c.latitud))
                  ))
                ELSE NULL END
            """
        sql = f"""
            WITH base AS ({base})
            SELECT b.*,
                   {dist_expr} AS distancia_km
            FROM base b
            JOIN complejos c ON c.id_complejo = b.id_complejo
        """
    else:
        sql = f"WITH base AS ({base}) SELECT b.*, NULL::numeric AS distancia_km FROM base b"

    row = db.execute(text(sql), params).mappings().first()
    return dict(row) if row else None


def owner_of_cancha(db: Session, id_cancha: int) -> Optional[int]:
    r = db.execute(text("""
        SELECT comp.id_dueno
        FROM canchas ch
        JOIN complejos comp ON comp.id_complejo = ch.id_complejo
        WHERE ch.id_cancha = :id
    """), {"id": id_cancha}).first()
    return int(r[0]) if r else None

def insert_cancha(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    # resolver deporte si vino por nombre
    payload = {
        "id_complejo": int(data["id_complejo"]),
        "nombre": data["nombre"],
        "id_deporte": data.get("id_deporte"),
        "cubierta": bool(data.get("cubierta", False)),
    }
    if payload["id_deporte"] is None and data.get("deporte"):
        dep_id = _resolve_deporte_id(db, str(data["deporte"]))
        if dep_id is None:
            raise ValueError("Deporte no encontrado")
        payload["id_deporte"] = dep_id
    if payload["id_deporte"] is None:
        raise ValueError("Debe enviar id_deporte o deporte")

    row = db.execute(text("""
        INSERT INTO canchas (id_complejo, nombre, id_deporte, cubierta, activo)
        VALUES (:id_complejo, :nombre, :id_deporte, :cubierta, TRUE)
        RETURNING id_cancha, id_complejo, nombre, id_deporte, cubierta, activo
    """), payload).mappings().first()
    db.commit()

    # traer nombre del deporte
    out = dict(row)
    dep_name = db.execute(text("SELECT nombre FROM deportes WHERE id_deporte=:id"), {"id": out["id_deporte"]}).scalar_one()
    out["deporte"] = dep_name
    del out["id_deporte"]
    # métricas default
    out["precio_desde"] = None
    out["rating_promedio"] = None
    out["total_resenas"] = 0
    out["distancia_km"] = None
    return out

def update_cancha(db: Session, id_cancha: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    updates: Dict[str, Any] = {}
    fields = ("nombre","cubierta","activo")
    for k in fields:
        if k in data and data[k] is not None:
            updates[k] = data[k]

    # deporte
    if data.get("id_deporte") is not None:
        updates["id_deporte"] = int(data["id_deporte"])
    elif data.get("deporte") is not None:
        dep_id = _resolve_deporte_id(db, str(data["deporte"]))
        if dep_id is None:
            raise ValueError("Deporte no encontrado")
        updates["id_deporte"] = dep_id

    if not updates:
        return get_cancha_by_id(db, id_cancha)

    set_parts = ", ".join([f"{k} = :{k}" for k in updates.keys()])
    params = {"id": id_cancha, **updates}
    row = db.execute(text(f"""
        UPDATE canchas
        SET {set_parts}, updated_at = now()
        WHERE id_cancha = :id
        RETURNING id_cancha, id_complejo, nombre, id_deporte, cubierta, activo
    """), params).mappings().first()
    db.commit()
    if not row:
        return None

    out = dict(row)
    dep_name = db.execute(text("SELECT nombre FROM deportes WHERE id_deporte=:id"), {"id": out["id_deporte"]}).scalar_one()
    out["deporte"] = dep_name
    del out["id_deporte"]

    # recomputar métricas
    agg = db.execute(text("""
        SELECT
          COALESCE(AVG(rs.puntuacion) FILTER (WHERE rs.esta_activa), NULL) AS rating_promedio,
          COUNT(rs.id_resena) FILTER (WHERE rs.esta_activa) AS total_resenas,
          (
            SELECT MIN(rp.precio_por_hora)
            FROM reglas_precio rp
            WHERE rp.id_cancha = :id
              AND (rp.vigente_desde IS NULL OR rp.vigente_desde <= CURRENT_DATE)
              AND (rp.vigente_hasta IS NULL OR rp.vigente_hasta >= CURRENT_DATE)
          ) AS precio_desde
        FROM resenas rs WHERE rs.id_cancha = :id
    """), {"id": id_cancha}).mappings().first()

    out["rating_promedio"] = agg["rating_promedio"]
    out["total_resenas"] = int(agg["total_resenas"] or 0)
    out["precio_desde"] = agg["precio_desde"]
    out["distancia_km"] = None
    return out

def soft_delete_cancha(db: Session, id_cancha: int) -> None:
    db.execute(text("UPDATE canchas SET activo = FALSE, updated_at = now() WHERE id_cancha = :id"), {"id": id_cancha})
    db.commit()

# ===== Fotos =====
def list_fotos_cancha(db: Session, id_cancha: int) -> List[Dict[str, Any]]:
    rows = db.execute(text("""
        SELECT id_foto, id_cancha, url_foto, orden
        FROM fotos_cancha
        WHERE id_cancha = :id
        ORDER BY orden ASC, id_foto ASC
    """), {"id": id_cancha}).mappings().all()
    return [dict(r) for r in rows]

def add_foto_cancha(db: Session, id_cancha: int, url_foto: str, orden: Optional[int]) -> Dict[str, Any]:
    if orden is None:
        ord_row = db.execute(text("SELECT COALESCE(MAX(orden),0)+1 FROM fotos_cancha WHERE id_cancha = :id"), {"id": id_cancha}).first()
        orden = int(ord_row[0] or 1)
    row = db.execute(text("""
        INSERT INTO fotos_cancha (id_cancha, url_foto, orden)
        VALUES (:id, :url, :orden)
        RETURNING id_foto, id_cancha, url_foto, orden
    """), {"id": id_cancha, "url": url_foto, "orden": orden}).mappings().first()
    db.commit()
    return dict(row)

def delete_foto_cancha(db: Session, id_cancha: int, id_foto: int) -> None:
    db.execute(text("DELETE FROM fotos_cancha WHERE id_foto = :f AND id_cancha = :c"), {"f": id_foto, "c": id_cancha})
    db.commit()