from __future__ import annotations
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

# =========================
# Detección de esquema (cache)
# =========================
_SCHEMA_CACHE: Dict[str, Any] = {}

def _has_postgis_loc(db: Session) -> bool:
    q = text("""
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema='public'
          AND table_name='complejos'
          AND column_name='loc'
        LIMIT 1
    """)
    return db.execute(q).first() is not None


def _fetch_cols(db: Session, table: str) -> set[str]:
    q = text("""
        SELECT lower(column_name) FROM information_schema.columns
        WHERE table_schema = 'public' AND lower(table_name) = :t
    """)
    return {r[0] for r in db.execute(q, {"t": table.lower()}).all()}

def _table_exists(db: Session, table: str) -> bool:
    q = text("""
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND lower(table_name)=:t
    """)
    return db.execute(q, {"t": table.lower()}).first() is not None

def _schema_info(db: Session) -> Dict[str, Any]:
    key = "default"
    if key in _SCHEMA_CACHE:
        return _SCHEMA_CACHE[key]

    cols_c = _fetch_cols(db, "complejos")
    has_comuna_text = "comuna" in cols_c            # algunos esquemas la traen
    has_id_comuna = "id_comuna" in cols_c           # tu esquema: SÍ
    has_loc = "loc" in cols_c                       # tu esquema: SÍ
    comunas_exists = _table_exists(db, "comunas")
    comunas_name_col: Optional[str] = None
    if comunas_exists:
        cols_co = _fetch_cols(db, "comunas")
        for cand in ("nombre", "comuna", "nombre_comuna"):
            if cand in cols_co:
                comunas_name_col = cand
                break

    info = {
        "has_comuna_text": has_comuna_text,
        "has_id_comuna": has_id_comuna,
        "has_loc": has_loc,
        "comunas_exists": comunas_exists,
        "comunas_name_col": comunas_name_col,
    }
    _SCHEMA_CACHE[key] = info
    return info

# =========================
# SELECT dinámico
# =========================
def _base_select(info: Dict[str, Any], dist_calc: bool) -> str:
    # columnas de comuna
    if info["has_comuna_text"]:
        comuna_sel = "c.comuna AS comuna"
        id_comuna_sel = "NULL::bigint AS id_comuna"
        join_co = ""
    elif info["has_id_comuna"]:
        id_comuna_sel = "c.id_comuna AS id_comuna"
        if info["comunas_exists"] and info["comunas_name_col"]:
            join_co = " LEFT JOIN comunas co ON co.id_comuna = c.id_comuna "
            comuna_sel = f"co.{info['comunas_name_col']} AS comuna"
        else:
            join_co = ""
            comuna_sel = "NULL::text AS comuna"
    else:
        comuna_sel = "NULL::text AS comuna"
        id_comuna_sel = "NULL::bigint AS id_comuna"
        join_co = ""

    # distancia: usa loc (PostGIS) si existe, si no, Haversine
    if dist_calc:
        if info["has_loc"]:
            dist = """
              , CASE WHEN :lat IS NOT NULL AND :lon IS NOT NULL AND c.loc IS NOT NULL THEN
                    ST_Distance(
                      c.loc,
                      ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                    )/1000.0
                ELSE NULL END AS distancia_km
            """
        else:
            dist = """
              , CASE WHEN :lat IS NOT NULL AND :lon IS NOT NULL AND c.latitud IS NOT NULL AND c.longitud IS NOT NULL THEN
                    (6371 * acos(
                        cos(radians(:lat)) * cos(radians(c.latitud)) * cos(radians(c.longitud) - radians(:lon))
                        + sin(radians(:lat)) * sin(radians(c.latitud))
                    ))
                ELSE NULL END AS distancia_km
            """
    else:
        dist = ", NULL::numeric AS distancia_km"

    return f"""
    SELECT
      c.id_complejo, c.id_dueno, c.nombre, c.direccion,
      {comuna_sel}, {id_comuna_sel},
      c.latitud, c.longitud, c.descripcion, c.activo,
      COALESCE(AVG(r.puntuacion) FILTER (WHERE r.esta_activa), NULL) AS rating_promedio,
      COUNT(r.id_resena) FILTER (WHERE r.esta_activa) AS total_resenas
      {dist}
    FROM complejos c
    LEFT JOIN resenas r ON r.id_complejo = c.id_complejo
    {join_co}
    """

def _comuna_for_where(info: Dict[str, Any]) -> Optional[str]:
    if info["has_comuna_text"]:
        return "c.comuna"
    if info["has_id_comuna"] and info["comunas_exists"] and info["comunas_name_col"]:
        return f"co.{info['comunas_name_col']}"
    return None

# =========================
# Búsqueda/paginación
# =========================
def search_complejos(
    db: Session,
    *,
    q: Optional[str],
    comuna: Optional[str],
    id_comuna: Optional[int],
    deporte: Optional[str],
    lat: Optional[float],
    lon: Optional[float],
    max_km: Optional[float],
    sort_by: str,
    order: str,
    offset: int,
    limit: int,
) -> Tuple[List[Dict[str, Any]], int]:
    info = _schema_info(db)
    params = {
        "q": f"%{q.lower()}%" if q else None,
        "comuna": comuna.lower() if comuna else None,
        "id_comuna": id_comuna,
        "deporte": deporte.lower() if deporte else None,
        "lat": lat, "lon": lon,
        "max_km": max_km,
        "offset": offset, "limit": limit
    }

    base = _base_select(info, dist_calc=(lat is not None and lon is not None))
    joins = ""
    wheres = ["c.activo = TRUE", "c.deleted_at IS NULL"]

    if deporte:
        joins += """
            JOIN canchas ch ON ch.id_complejo = c.id_complejo AND ch.activo = TRUE AND ch.deleted_at IS NULL
            JOIN deportes d ON d.id_deporte = ch.id_deporte
        """
        wheres.append("lower(d.nombre) = :deporte")

    comuna_expr = _comuna_for_where(info)
    if q:
        if comuna_expr:
            wheres.append(f"(lower(c.nombre) LIKE :q OR lower(c.direccion) LIKE :q OR lower({comuna_expr}) LIKE :q)")
        else:
            wheres.append("(lower(c.nombre) LIKE :q OR lower(c.direccion) LIKE :q)")

    if comuna and comuna_expr:
        wheres.append(f"lower({comuna_expr}) = :comuna")

    if id_comuna is not None and info["has_id_comuna"]:
        wheres.append("c.id_comuna = :id_comuna")

    # 🔧 GROUP BY dinámico
    group_by_cols = ["c.id_complejo"]
    if info["has_id_comuna"] and info["comunas_exists"] and info["comunas_name_col"]:
        group_by_cols.append(f"co.{info['comunas_name_col']}")

    sql = base + joins + " WHERE " + " AND ".join(wheres) + " GROUP BY " + ", ".join(group_by_cols)

    if max_km is not None and lat is not None and lon is not None:
        sql = f"WITH base AS ({sql}) SELECT * FROM base WHERE distancia_km <= :max_km"
    else:
        sql = f"WITH base AS ({sql}) SELECT * FROM base"

    ordermap = {
        "distancia": "distancia_km NULLS LAST",
        "rating": "rating_promedio NULLS LAST",
        "nombre": "nombre",
        "recientes": "id_complejo DESC"
    }
    ob = ordermap.get(sort_by, "nombre")
    direction = "ASC" if (order or "").lower() == "asc" else "DESC"
    sql += f" ORDER BY {ob} {direction}"

    count_sql = f"SELECT count(*) FROM ({sql}) t"
    total = db.execute(text(count_sql), params).scalar_one()

    sql += " LIMIT :limit OFFSET :offset"
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(r) for r in rows], int(total)


def get_complejo_by_id(db: Session, id_complejo: int, lat: Optional[float]=None, lon: Optional[float]=None) -> Optional[Dict[str, Any]]:
    info = _schema_info(db)
    params = {"id": id_complejo, "lat": lat, "lon": lon}
    base = _base_select(info, dist_calc=(lat is not None and lon is not None))

    # 🔧 GROUP BY dinámico
    group_by_cols = ["c.id_complejo"]
    if info["has_id_comuna"] and info["comunas_exists"] and info["comunas_name_col"]:
        group_by_cols.append(f"co.{info['comunas_name_col']}")

    sql = base + " WHERE c.id_complejo = :id GROUP BY " + ", ".join(group_by_cols)
    row = db.execute(text(sql), params).mappings().first()
    return dict(row) if row else None

# ====== Helpers comuna ======
def _resolve_comuna_id(db: Session, info: Dict[str, Any], nombre: str) -> Optional[int]:
    if not (info["comunas_exists"] and info["comunas_name_col"]):
        return None
    q = text(f"SELECT id_comuna FROM comunas WHERE lower({info['comunas_name_col']}) = :n LIMIT 1")
    r = db.execute(q, {"n": nombre.lower()}).first()
    return int(r[0]) if r else None

def _resolve_comuna_nombre(db: Session, info: Dict[str, Any], id_comuna: int) -> Optional[str]:
    if not (info["comunas_exists"] and info["comunas_name_col"]):
        return None
    q = text(f"SELECT {info['comunas_name_col']} FROM comunas WHERE id_comuna = :i")
    r = db.execute(q, {"i": id_comuna}).first()
    return str(r[0]) if r else None

# ====== Insert/Update ======
def insert_complejo(db: Session, id_dueno: int, data: Dict[str, Any]) -> Dict[str, Any]:
    info = _schema_info(db)
    payload: Dict[str, Any] = {
        "id_dueno": id_dueno,
        "nombre": data.get("nombre"),
        "direccion": data.get("direccion"),
        "latitud": data.get("latitud"),
        "longitud": data.get("longitud"),
        "descripcion": data.get("descripcion"),
    }

    if info["has_comuna_text"]:
        comuna_val = data.get("comuna")
        if not comuna_val and data.get("id_comuna") is not None:
            nombre = _resolve_comuna_nombre(db, info, int(data["id_comuna"]))
            if nombre:
                comuna_val = nombre
        if not comuna_val:
            raise ValueError("Debe enviar 'comuna' (texto) o 'id_comuna' resolvible a nombre")
        payload["comuna"] = comuna_val
        cols = "(id_dueno, nombre, descripcion, direccion, comuna, latitud, longitud, activo)"
        vals = "(:id_dueno, :nombre, :descripcion, :direccion, :comuna, :latitud, :longitud, TRUE)"
    elif info["has_id_comuna"]:
        idc = data.get("id_comuna")
        if idc is None and data.get("comuna"):
            idc = _resolve_comuna_id(db, info, str(data["comuna"]))
        if idc is None:
            raise ValueError("Debe enviar 'id_comuna' o 'comuna' resolvible a id")
        payload["id_comuna"] = int(idc)
        cols = "(id_dueno, nombre, descripcion, direccion, id_comuna, latitud, longitud, activo)"
        vals = "(:id_dueno, :nombre, :descripcion, :direccion, :id_comuna, :latitud, :longitud, TRUE)"
    else:
        cols = "(id_dueno, nombre, descripcion, direccion, latitud, longitud, activo)"
        vals = "(:id_dueno, :nombre, :descripcion, :direccion, :latitud, :longitud, TRUE)"

    sql = text(f"""
        INSERT INTO complejos {cols}
        VALUES {vals}
        RETURNING id_complejo, id_dueno, nombre, direccion,
                  {"comuna" if info["has_comuna_text"] else "NULL::text AS comuna"},
                  {"id_comuna" if info["has_id_comuna"] else "NULL::bigint AS id_comuna"},
                  latitud, longitud, descripcion, activo
    """)
    row = db.execute(sql, payload).mappings().first()
    db.commit()
    return dict(row)

def update_complejo(db: Session, id_complejo: int, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    info = _schema_info(db)

    updates: Dict[str, Any] = {}
    for k in ("nombre","direccion","latitud","longitud","descripcion","activo"):
        if k in data and data[k] is not None:
            updates[k] = data[k]

    if info["has_comuna_text"]:
        if "comuna" in data and data["comuna"] is not None:
            updates["comuna"] = data["comuna"]
        elif "id_comuna" in data and data["id_comuna"] is not None:
            nombre = _resolve_comuna_nombre(db, info, int(data["id_comuna"]))
            if nombre:
                updates["comuna"] = nombre
            else:
                raise ValueError("id_comuna no se pudo resolver a nombre")
    elif info["has_id_comuna"]:
        if "id_comuna" in data and data["id_comuna"] is not None:
            updates["id_comuna"] = int(data["id_comuna"])
        elif "comuna" in data and data["comuna"] is not None:
            idc = _resolve_comuna_id(db, info, str(data["comuna"]))
            if idc is not None:
                updates["id_comuna"] = int(idc)
            else:
                raise ValueError("comuna no se pudo resolver a id_comuna")

    if not updates:
        return get_complejo_by_id(db, id_complejo)

    set_parts = [f"{k} = :{k}" for k in updates.keys()]
    params = {"id": id_complejo, **updates}
    sql = text(f"""
        UPDATE complejos SET {", ".join(set_parts)}, updated_at = now()
        WHERE id_complejo = :id
        RETURNING id_complejo, id_dueno, nombre, direccion,
                  {"comuna" if info["has_comuna_text"] else "NULL::text AS comuna"},
                  {"id_comuna" if info["has_id_comuna"] else "NULL::bigint AS id_comuna"},
                  latitud, longitud, descripcion, activo
    """)
    row = db.execute(sql, params).mappings().first()
    db.commit()
    return dict(row) if row else None

def soft_delete_complejo(db: Session, id_complejo: int) -> None:
    db.execute(text("UPDATE complejos SET activo = FALSE, updated_at = now() WHERE id_complejo = :id"), {"id": id_complejo})
    db.commit()

def owner_of_complejo(db: Session, id_complejo: int) -> Optional[int]:
    row = db.execute(text("SELECT id_dueno FROM complejos WHERE id_complejo = :id"), {"id": id_complejo}).first()
    return int(row[0]) if row else None

def list_canchas(db: Session, id_complejo: int) -> List[Dict[str, Any]]:
    rows = db.execute(text("""
        SELECT ch.id_cancha, ch.id_complejo, ch.nombre,
               d.nombre AS deporte,
               NULL::text AS superficie,
               NULL::int  AS capacidad,
               FALSE AS iluminacion,
               ch.cubierta AS techada,
               ch.activo   AS esta_activa
        FROM canchas ch
        JOIN deportes d ON d.id_deporte = ch.id_deporte
        WHERE ch.id_complejo = :id AND ch.deleted_at IS NULL
        ORDER BY ch.id_cancha ASC
    """), {"id": id_complejo}).mappings().all()
    return [dict(r) for r in rows]

def list_horarios(db: Session, id_complejo: int) -> List[Dict[str, Any]]:
    rows = db.execute(text("""
        SELECT id_horario, id_complejo, id_cancha,
               dia::text AS dia_semana,
               to_char(hora_apertura,'HH24:MI') AS hora_apertura,
               to_char(hora_cierre,'HH24:MI')   AS hora_cierre
        FROM horarios_atencion
        WHERE id_complejo = :id
        ORDER BY id_cancha NULLS FIRST, id_horario
    """), {"id": id_complejo}).mappings().all()
    return [dict(r) for r in rows]

def list_bloqueos(db: Session, id_complejo: int) -> List[Dict[str, Any]]:
    rows = db.execute(text("""
        SELECT b.id_bloqueo,
               ch.id_complejo,
               b.id_cancha,
               to_char(b.inicio, 'YYYY-MM-DD') AS fecha_inicio,
               to_char(b.fin,    'YYYY-MM-DD') AS fecha_fin,
               to_char(b.inicio, 'HH24:MI')    AS hora_inicio,
               to_char(b.fin,    'HH24:MI')    AS hora_fin,
               b.motivo
        FROM bloqueos b
        JOIN canchas ch ON ch.id_cancha = b.id_cancha
        WHERE ch.id_complejo = :id
        ORDER BY b.id_bloqueo DESC
    """), {"id": id_complejo}).mappings().all()
    return [dict(r) for r in rows]

def resumen_basico(db: Session, id_complejo: int, desde: str, hasta: str) -> Dict[str, Any]:
    n_canchas = db.execute(
        text("SELECT COUNT(*) FROM canchas WHERE id_complejo=:id AND activo=TRUE AND deleted_at IS NULL"),
        {"id": id_complejo}
    ).scalar_one()

    q = text("""
        SELECT
          COUNT(*) FILTER (WHERE r.estado='confirmada') AS reservas_confirmadas,
          COALESCE(SUM(EXTRACT(EPOCH FROM (r.fin - r.inicio))/3600.0) FILTER (WHERE r.estado='confirmada'), 0) AS horas_reservadas,
          COALESCE(SUM(r.precio_total) FILTER (WHERE r.estado='confirmada'), 0) AS ingresos_confirmados
        FROM reservas r
        JOIN canchas ch ON ch.id_cancha = r.id_cancha
        WHERE ch.id_complejo = :id
          AND r.inicio::date BETWEEN :desde AND :hasta
    """)
    kpis = db.execute(q, {"id": id_complejo, "desde": desde, "hasta": hasta}).mappings().first()
    reservas_confirmadas = int(kpis["reservas_confirmadas"] or 0)
    horas_reservadas = float(kpis["horas_reservadas"] or 0.0)
    ingresos_confirmados = float(kpis["ingresos_confirmados"] or 0.0)

    horarios = db.execute(text("""
        SELECT dia::text AS dia, EXTRACT(EPOCH FROM (hora_cierre - hora_apertura))/3600.0 AS horas
        FROM horarios_atencion
        WHERE id_complejo = :id AND id_cancha IS NULL
    """), {"id": id_complejo}).mappings().all()
    horas_por_dia = {h["dia"].lower(): float(h["horas"]) for h in horarios}

    from datetime import datetime, timedelta
    d0 = datetime.fromisoformat(desde).date()
    d1 = datetime.fromisoformat(hasta).date()
    total_dias = (d1 - d0).days + 1
    dias_sem = {"lunes":0,"martes":0,"miercoles":0,"jueves":0,"viernes":0,"sabado":0,"domingo":0}
    for i in range(total_dias):
        d = d0 + timedelta(days=i)
        key = ["lunes","martes","miercoles","jueves","viernes","sabado","domingo"][d.weekday()]
        dias_sem[key] += 1

    horas_disponibles = sum((horas_por_dia.get(k, 0.0) * n) for k, n in dias_sem.items())
    capacidad = horas_disponibles * (n_canchas or 0)
    ocupacion = float(horas_reservadas / capacidad) if capacidad > 0 else 0.0

    return {
        "reservas_confirmadas": reservas_confirmadas,
        "horas_reservadas": horas_reservadas,
        "ingresos_confirmados": ingresos_confirmados,
        "ocupacion": round(ocupacion, 4),
    }

def list_complejos(
    db: Session,
    params,           # ComplejosQuery
    bounds: dict | None,
    use_radius: bool,
    offset: int,
    limit: int,
):
    """
    Esta es la versión nueva que soporta:
    - bounds del mapa (priority alta)
    - radio (lat/lon/max_km) si no hay bounds
    - listado general si no hay ninguno de los dos

    Devuelve (rows, total) donde rows son dicts compatibles con ComplejoOut.
    """

    info = _schema_info(db)

    # ===== centro "de referencia" para calcular distancia_km =====
    # Si hay bounds, usamos el centro del rectángulo visible.
    # Si no hay bounds, usamos la lat/lon que venían en la query.
    if bounds is not None:
        center_lat = (bounds["north"] + bounds["south"]) / 2.0
        center_lon = (bounds["east"]  + bounds["west"])  / 2.0
    else:
        center_lat = params.lat
        center_lon = params.lon

    # esto se usa dentro de _base_select(...) para calcular distancia_km
    dist_calc_enabled = (center_lat is not None and center_lon is not None)

    base_sql = _base_select(info, dist_calc=dist_calc_enabled)

    # ===== joins dinámicos =====
    joins = ""
    wheres = ["c.activo = TRUE", "c.deleted_at IS NULL"]

    # deporte: requiere que el complejo tenga al menos una cancha activa de ese deporte
    if params.deporte:
        joins += """
            JOIN canchas ch ON ch.id_complejo = c.id_complejo
               AND ch.activo = TRUE
               AND ch.deleted_at IS NULL
            JOIN deportes d ON d.id_deporte = ch.id_deporte
        """
        wheres.append("lower(d.nombre) = :deporte")

    # ===== búsqueda por texto / comuna / id_comuna =====
    comuna_expr = _comuna_for_where(info)

    if params.q:
        if comuna_expr:
            wheres.append(
                f"(lower(c.nombre) LIKE :q OR lower(c.direccion) LIKE :q OR lower({comuna_expr}) LIKE :q)"
            )
        else:
            wheres.append(
                "(lower(c.nombre) LIKE :q OR lower(c.direccion) LIKE :q)"
            )

    if params.comuna and comuna_expr:
        wheres.append(f"lower({comuna_expr}) = :comuna")

    if params.id_comuna is not None and info["has_id_comuna"]:
        wheres.append("c.id_comuna = :id_comuna")

    # ===== filtro espacial (bounds o radio) =====
    # 1. Bounds del mapa (viewport)
    if bounds is not None:
        if info["has_loc"]:
            wheres.append("""
                ST_Within(
                    c.loc,
                    ST_MakeEnvelope(:west_bound, :south_bound, :east_bound, :north_bound, 4326)
                )
            """)
        else:
            wheres.append("""
                c.latitud  BETWEEN :south_bound AND :north_bound
                AND c.longitud BETWEEN :west_bound  AND :east_bound
            """)

    # 2. Radio en km (solo si NO hay bounds)
    #    Nota: igual que en search_complejos, nosotros vamos a filtrar por distancia_km
    #    DESPUÉS con un WHERE externo (distancia_km <= :max_km), en vez de hacerlo acá.
    #    Peeero si quieres, puedes meter ST_DWithin aquí. Lo dejamos simple/consistente.
    #    Entonces NO agregamos nada extra al WHERE base por 'use_radius' acá.

    # ===== GROUP BY dinámico =====
    group_by_cols = ["c.id_complejo"]
    if info["has_id_comuna"] and info["comunas_exists"] and info["comunas_name_col"]:
        group_by_cols.append(f"co.{info['comunas_name_col']}")

    where_sql = " AND ".join(wheres)

    # query base agregando joins, where y group by
    sql_core = (
        base_sql
        + joins
        + " WHERE "
        + where_sql
        + " GROUP BY "
        + ", ".join(group_by_cols)
    )

    # ===== envolvemos en WITH base AS (...) para poder filtrar por distancia_km y paginar =====
    # si estamos en modo radio, aplicamos max_km sobre distancia_km
    if use_radius and params.max_km is not None and params.lat is not None and params.lon is not None:
        sql_wrapped = f"""
            WITH base AS (
                {sql_core}
            )
            SELECT * FROM base
            WHERE distancia_km <= :max_km
        """
    else:
        sql_wrapped = f"""
            WITH base AS (
                {sql_core}
            )
            SELECT * FROM base
        """

    # ===== ORDER BY dinámico =====
    ordermap = {
        "distancia": "distancia_km NULLS LAST",
        "rating": "rating_promedio NULLS LAST",
        "nombre": "nombre",
        "recientes": "id_complejo DESC",
    }

    sort_key = (params.sort_by or "nombre")
    ob_expr = ordermap.get(sort_key, "nombre")
    direction = "ASC" if (params.order or "").lower() == "asc" else "DESC"

    sql_wrapped += f" ORDER BY {ob_expr} {direction}"

    # Para count total, usamos el SELECT envuelto antes de LIMIT/OFFSET
    count_sql = f"SELECT count(*) FROM ({sql_wrapped}) t"

    # Finalmente aplicamos paginación
    sql_wrapped += " LIMIT :limit OFFSET :offset"

    # ====== parámetros ======
    sql_params: Dict[str, Any] = {
        # filtros básicos
        "q": f"%{params.q.lower()}%" if params.q else None,
        "comuna": params.comuna.lower() if params.comuna else None,
        "id_comuna": params.id_comuna,
        "deporte": params.deporte.lower() if params.deporte else None,

        # centro para cálculo de distancia en _base_select()
        "lat": center_lat,
        "lon": center_lon,

        # radio (para el WHERE distancia_km <= :max_km si aplica)
        "max_km": float(params.max_km) if params.max_km is not None else None,

        # paginación
        "limit": limit,
        "offset": offset,
    }

    # bounds si aplica
    if bounds is not None:
        sql_params.update({
            "north_bound": bounds["north"],
            "south_bound": bounds["south"],
            "east_bound":  bounds["east"],
            "west_bound":  bounds["west"],
        })

    # Ejecutar
    total = db.execute(text(count_sql), sql_params).scalar_one()
    rows = db.execute(text(sql_wrapped), sql_params).mappings().all()

    return [dict(r) for r in rows], int(total)

