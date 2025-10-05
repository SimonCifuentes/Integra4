from __future__ import annotations
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

_TZ = ZoneInfo("America/Santiago")

# ====== SELECT base y RETURNING estándar ======
_DEF_SELECT = """
SELECT
  r.id_reserva,
  r.id_usuario,
  r.id_cancha,
  (r.inicio AT TIME ZONE 'America/Santiago')::date AS fecha_reserva,
  to_char(r.inicio AT TIME ZONE 'America/Santiago', 'HH24:MI') AS hora_inicio,
  to_char(r.fin    AT TIME ZONE 'America/Santiago', 'HH24:MI') AS hora_fin,
  CASE r.estado
    WHEN 'pendiente'  THEN 'pending'
    WHEN 'confirmada' THEN 'confirmed'
    WHEN 'cancelada'  THEN 'cancelled'
    ELSE 'pending'
  END AS estado,
  r.precio_total AS monto_total
FROM reservas r
"""

_DEF_RETURNING = """
  r.id_reserva,
  r.id_usuario,
  r.id_cancha,
  (r.inicio AT TIME ZONE 'America/Santiago')::date AS fecha_reserva,
  to_char(r.inicio AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_inicio,
  to_char(r.fin    AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_fin,
  'cancelled' AS estado,
  r.precio_total AS monto_total
"""

# ====== Helpers internos ======
def _fetch_reserva(db: Session, id_reserva: int) -> Optional[Dict[str, Any]]:
    sql = text("""
        SELECT r.id_reserva, r.id_usuario, r.id_cancha, r.inicio, r.fin, r.estado
        FROM reservas r
        WHERE r.id_reserva = :rid
        LIMIT 1
    """)
    row = db.execute(sql, {"rid": id_reserva}).mappings().one_or_none()
    return dict(row) if row else None

def _ya_empezo(db: Session, id_reserva: int) -> bool:
    sql = text("SELECT (inicio <= now()) AS ya FROM reservas WHERE id_reserva=:rid")
    val = db.execute(sql, {"rid": id_reserva}).scalar()
    return bool(val)

# ====== Crear y listar (lo tuyo, intacto) ======
def create_reserva(db: Session, *, id_usuario: int, id_cancha: int, fecha, h_ini, h_fin) -> Dict[str, Any]:
    inicio = datetime.combine(fecha, h_ini).replace(tzinfo=_TZ)
    fin    = datetime.combine(fecha, h_fin).replace(tzinfo=_TZ)
    if fin <= inicio:
        raise ValueError("hora_fin debe ser > hora_inicio")

    sql = text(
        """
        INSERT INTO reservas (id_cancha, id_usuario, inicio, fin, estado, precio_total)
        VALUES (:id_cancha, :id_usuario, :inicio, :fin, 'confirmada', NULL)
        RETURNING id_reserva, id_usuario, id_cancha,
                  (inicio AT TIME ZONE 'America/Santiago')::date AS fecha_reserva,
                  to_char(inicio AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_inicio,
                  to_char(fin    AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_fin,
                  CASE estado WHEN 'pendiente' THEN 'pending' WHEN 'confirmada' THEN 'confirmed' WHEN 'cancelada' THEN 'cancelled' ELSE 'pending' END AS estado,
                  precio_total AS monto_total
        """
    )
    try:
        row = db.execute(sql, {
            "id_cancha": id_cancha,
            "id_usuario": id_usuario,
            "inicio": inicio,
            "fin": fin,
        }).mappings().one()
        db.commit()
        return dict(row)
    except Exception as e:
        db.rollback()
        # choque por constraint EXCLUDE (solapamiento)
        msg = str(e).lower()
        if "exclude" in msg or "tstzrange" in msg or "overlap" in msg:
            raise RuntimeError("OVERLAP")
        raise

def list_mis_reservas(db: Session, *, id_usuario: int) -> List[Dict[str, Any]]:
    sql = text(_DEF_SELECT + " WHERE r.id_usuario = :uid ORDER BY r.inicio DESC LIMIT 200")
    rows = db.execute(sql, {"uid": id_usuario}).mappings().all()
    return [dict(r) for r in rows]

# ====== NUEVO: Cancelar (usuario) con reglas y errores claros ======
def cancelar_reserva_usuario(db: Session, *, id_usuario: int, id_reserva: int) -> Dict[str, Any]:
    """
    Reglas:
    - Debe existir y pertenecer al usuario.
    - Estado debe ser pendiente/confirmada.
    - No se puede cancelar si ya comenzó.
    Devuelve dict con datos de la reserva cancelada o {"error": "..."}.
    """
    r = _fetch_reserva(db, id_reserva)
    if not r:
        return {"error": "not_found"}

    if r["id_usuario"] != id_usuario:
        return {"error": "forbidden"}

    if r["estado"] not in ("pendiente", "confirmada"):
        return {"error": "bad_state", "estado": r["estado"]}

    if _ya_empezo(db, id_reserva):
        return {"error": "too_late"}

    sql = text(f"""
        UPDATE reservas r
           SET estado='cancelada', updated_at=now()
         WHERE r.id_reserva=:rid
           AND r.id_usuario=:uid
           AND r.estado IN ('pendiente','confirmada')
           AND r.inicio > now()
        RETURNING {_DEF_RETURNING}
    """)
    row = db.execute(sql, {"rid": id_reserva, "uid": id_usuario}).mappings().one_or_none()
    if not row:
        db.rollback()
        return {"error": "conflict"}
    db.commit()
    return dict(row)

# ====== NUEVO: Cancelar (dueño/admin) ======
def cancelar_reserva_por_actor(
    db: Session, *, actor_id: int, id_reserva: int, is_admin: bool = False
) -> Dict[str, Any]:
    """
    Reglas:
    - Dueño del complejo: puede cancelar reservas de sus canchas.
    - Admin/Superadmin: puede cancelar cualquiera (is_admin=True).
    - Estado debe ser pendiente/confirmada. (Política: permitimos aunque ya haya iniciado.)
    """
    sql_check = text("""
        SELECT r.id_reserva, r.estado, r.id_cancha, co.id_dueno AS dueno_id
        FROM reservas r
        JOIN canchas c   ON c.id_cancha = r.id_cancha
        JOIN complejos co ON co.id_complejo = c.id_complejo
        WHERE r.id_reserva = :rid
        LIMIT 1
    """)
    row = db.execute(sql_check, {"rid": id_reserva}).mappings().one_or_none()
    if not row:
        return {"error": "not_found"}

    if row["estado"] not in ("pendiente", "confirmada"):
        return {"error": "bad_state", "estado": row["estado"]}

    es_dueno = (row["dueno_id"] == actor_id)

    # Si no es admin, debe ser dueño
    if not is_admin and not es_dueno:
        return {"error": "forbidden"}

    if es_dueno and not is_admin:
        # Vía dueño (comprueba propiedad en el UPDATE)
        sql_owner = text(f"""
            UPDATE reservas r
               SET estado='cancelada', updated_at=now()
            FROM canchas c, complejos co
            WHERE r.id_reserva=:rid
              AND r.id_cancha=c.id_cancha
              AND co.id_complejo=c.id_complejo
              AND co.id_dueno=:actor
              AND r.estado IN ('pendiente','confirmada')
            RETURNING {_DEF_RETURNING}
        """)
        upd = db.execute(sql_owner, {"rid": id_reserva, "actor": actor_id}).mappings().one_or_none()
        if not upd:
            db.rollback()
            return {"error": "conflict"}
        db.commit()
        return dict(upd)

    # Vía admin/superadmin (sin restricción de dueño)
    sql_any = text(f"""
        UPDATE reservas r
           SET estado='cancelada', updated_at=now()
         WHERE r.id_reserva=:rid
           AND r.estado IN ('pendiente','confirmada')
        RETURNING {_DEF_RETURNING}
    """)
    upd = db.execute(sql_any, {"rid": id_reserva}).mappings().one_or_none()
    if not upd:
        db.rollback()
        return {"error": "conflict"}
    db.commit()
    return dict(upd)

# ====== COMPAT: tu función original, ahora usando las reglas nuevas ======
def cancelar_reserva(db: Session, *, id_usuario: int, id_reserva: int) -> Dict[str, Any] | None:
    """
    Compatibilidad con código existente.
    - Devuelve dict si canceló.
    - Devuelve None si no pudo (por pertenencia/estado/tiempo).
    """
    res = cancelar_reserva_usuario(db, id_usuario=id_usuario, id_reserva=id_reserva)
    if "error" in res:
        db.rollback()
        return None
    return res
