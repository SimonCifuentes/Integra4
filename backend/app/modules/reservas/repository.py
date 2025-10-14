from __future__ import annotations
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Any, Dict, List
from sqlalchemy import text
from sqlalchemy.orm import Session

_TZ = ZoneInfo("America/Santiago")

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

def cancelar_reserva(db: Session, *, id_usuario: int, id_reserva: int) -> Dict[str, Any] | None:
    sql = text(
        """
        UPDATE reservas
           SET estado='cancelada', updated_at=now()
         WHERE id_reserva=:rid AND id_usuario=:uid AND estado IN ('pendiente','confirmada')
        RETURNING id_reserva, id_usuario, id_cancha,
                  (inicio AT TIME ZONE 'America/Santiago')::date AS fecha_reserva,
                  to_char(inicio AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_inicio,
                  to_char(fin    AT TIME ZONE 'America/Santiago','HH24:MI') AS hora_fin,
                  'cancelled' AS estado,
                  precio_total AS monto_total
        """
    )
    row = db.execute(sql, {"rid": id_reserva, "uid": id_usuario}).mappings().one_or_none()
    if row is None:
        db.rollback()
        return None
    db.commit()
    return dict(row)
