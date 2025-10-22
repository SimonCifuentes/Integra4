# app/modules/resenas/repository.py
from __future__ import annotations

from typing import Any, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

# =========================
#  SELECT base (aliasamos puntuacion -> calificacion)
#  y devolvemos updated_at como NULL (tu tabla no lo tiene)
# =========================
_DEF_SELECT = """
SELECT
  r.id_resena,
  r.id_usuario,
  r.id_cancha,
  r.id_complejo,
  r.puntuacion AS calificacion,
  r.comentario,
  r.esta_activa,
  r.created_at,
  NULL::timestamptz AS updated_at
FROM resenas r
"""

def list_resenas(
    db: Session,
    id_cancha: Optional[int],
    id_complejo: Optional[int],
    order: str,
    page: int,
    page_size: int,
) -> list[dict[str, Any]]:
    where = []
    params: dict[str, Any] = {}
    if id_cancha is not None:
        where.append("r.id_cancha = :id_cancha")
        params["id_cancha"] = id_cancha
    if id_complejo is not None:
        where.append("r.id_complejo = :id_complejo")
        params["id_complejo"] = id_complejo

    where_sql = ("WHERE " + " AND ".join(where)) if where else ""

    order_sql = {
        "recientes": "ORDER BY r.created_at DESC",
        "mejor":     "ORDER BY r.puntuacion DESC, r.created_at DESC",
        "peor":      "ORDER BY r.puntuacion ASC,  r.created_at DESC",
    }.get(order, "ORDER BY r.created_at DESC")

    agg_cte = ""
    agg_join = ""
    if id_cancha is not None:
        agg_cte = """
        , agg AS (
          SELECT id_cancha AS target_id,
                 ROUND(AVG(puntuacion)::numeric, 2) AS promedio_rating,
                 COUNT(*) AS total_resenas
          FROM resenas
          WHERE id_cancha = :id_cancha
          GROUP BY id_cancha
        )"""
        agg_join = "LEFT JOIN agg ON agg.target_id = b.id_cancha"
    elif id_complejo is not None:
        agg_cte = """
        , agg AS (
          SELECT id_complejo AS target_id,
                 ROUND(AVG(puntuacion)::numeric, 2) AS promedio_rating,
                 COUNT(*) AS total_resenas
          FROM resenas
          WHERE id_complejo = :id_complejo
          GROUP BY id_complejo
        )"""
        agg_join = "LEFT JOIN agg ON agg.target_id = b.id_complejo"

    sql = f"""
    WITH base AS (
      {_DEF_SELECT}
      {where_sql}
      {order_sql}
      LIMIT :limit OFFSET :offset
    )
    {agg_cte}
    SELECT b.*, agg.promedio_rating, agg.total_resenas
    FROM base b
    {agg_join}
    """
    params.update({"limit": page_size, "offset": (page - 1) * page_size})
    rows = db.execute(text(sql), params).mappings().all()
    return [dict(x) for x in rows]


def get_resena(db: Session, id_resena: int) -> Optional[dict]:
    sql = _DEF_SELECT + " WHERE r.id_resena = :id LIMIT 1"
    row = db.execute(text(sql), {"id": id_resena}).mappings().first()
    return dict(row) if row else None


def insert_resena(
    db: Session,
    *,
    id_usuario: int,
    id_cancha: Optional[int],
    id_complejo: Optional[int],
    calificacion: int,
    comentario: Optional[str],
) -> dict:
    sql = """
    INSERT INTO resenas (id_usuario, id_cancha, id_complejo, puntuacion, comentario)
    VALUES (:id_usuario, :id_cancha, :id_complejo, :calificacion, :comentario)
    RETURNING
      id_resena,
      id_usuario,
      id_cancha,
      id_complejo,
      puntuacion AS calificacion,
      comentario,
      esta_activa,
      created_at,
      NULL::timestamptz AS updated_at
    """
    try:
        row = db.execute(
            text(sql),
            {
                "id_usuario": id_usuario,
                "id_cancha": id_cancha,
                "id_complejo": id_complejo,
                "calificacion": calificacion,
                "comentario": comentario,
            },
        ).mappings().first()
        db.commit()  # <<< confirma la transacción
        return dict(row)
    except Exception:
        db.rollback()
        raise


def update_resena(
    db: Session,
    id_resena: int,
    *,
    id_usuario: int,
    calificacion: Optional[int],
    comentario: Optional[str],
) -> Optional[dict]:
    sets = []
    params = {"id_resena": id_resena, "id_usuario": id_usuario}
    if calificacion is not None:
        sets.append("puntuacion = :calificacion")
        params["calificacion"] = calificacion
    if comentario is not None:
        sets.append("comentario = :comentario")
        params["comentario"] = comentario

    if not sets:
        return get_resena(db, id_resena)

    sql = f"""
    UPDATE resenas
    SET {", ".join(sets)}
    WHERE id_resena = :id_resena AND id_usuario = :id_usuario
    RETURNING
      id_resena,
      id_usuario,
      id_cancha,
      id_complejo,
      puntuacion AS calificacion,
      comentario,
      esta_activa,
      created_at,
      NULL::timestamptz AS updated_at
    """
    try:
        row = db.execute(text(sql), params).mappings().first()
        if row:
            db.commit()
            return dict(row)
        else:
            db.rollback()
            return None
    except Exception:
        db.rollback()
        raise


def delete_resena(db: Session, id_resena: int, *, id_usuario: Optional[int], admin: bool) -> bool:
    if admin:
        sql = "DELETE FROM resenas WHERE id_resena = :id_resena"
        params = {"id_resena": id_resena}
    else:
        sql = "DELETE FROM resenas WHERE id_resena = :id_resena AND id_usuario = :id_usuario"
        params = {"id_resena": id_resena, "id_usuario": id_usuario}
    try:
        res = db.execute(text(sql), params)
        db.commit()
        return res.rowcount > 0
    except Exception:
        db.rollback()
        raise


def insert_reporte(db: Session, *, id_resena: int, id_reportante: int, motivo: Optional[str]) -> dict:
    sql = """
    INSERT INTO resenas_reportes (id_resena, id_reportante, motivo)
    VALUES (:id_resena, :id_reportante, :motivo)
    ON CONFLICT (id_resena, id_reportante)
    DO UPDATE SET motivo = EXCLUDED.motivo
    RETURNING id_reporte, id_resena, id_reportante, motivo, created_at
    """
    try:
        row = db.execute(
            text(sql),
            {"id_resena": id_resena, "id_reportante": id_reportante, "motivo": motivo},
        ).mappings().first()
        db.commit()
        return dict(row)
    except Exception:
        db.rollback()
        raise


def get_resena_target(db: Session, id_resena: int) -> Optional[dict]:
    sql = """
    SELECT
      r.id_resena,
      r.id_cancha,
      r.id_complejo,
      COALESCE(r.id_complejo, c.id_complejo) AS id_complejo_resuelto
    FROM resenas r
    LEFT JOIN canchas c ON c.id_cancha = r.id_cancha
    WHERE r.id_resena = :id
    LIMIT 1
    """
    row = db.execute(text(sql), {"id": id_resena}).mappings().first()
    return dict(row) if row else None


def is_user_admin_of_complejo(db: Session, user_id: int, id_complejo: int) -> bool:
    sql = """
    SELECT 1
    FROM complejos comp
    WHERE comp.id_complejo = :cid
      AND comp.id_dueno = :uid
    LIMIT 1
    """
    return db.execute(text(sql), {"cid": id_complejo, "uid": user_id}).first() is not None
