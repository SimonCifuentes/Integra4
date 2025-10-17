# app/modules/reservas/repository.py
from __future__ import annotations
from datetime import datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo
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
  r.estado::text AS estado,
  r.precio_total,
  r.notas
FROM reservas r
"""

def _mk_ts(fecha: str, hora: str) -> str:
    # Retorna timestamptz en zona Chile
    # Ej: '2025-10-21 19:00 America/Santiago'
    return f"{fecha} {hora} America/Santiago"

def existe_solape(db: Session, id_cancha: int, ts_ini: str, ts_fin: str, excluir_id: Optional[int]=None) -> bool:
    q = """
    SELECT EXISTS (
      SELECT 1
      FROM reservas r
      WHERE r.id_cancha = :id_cancha
        AND r.estado IN ('pendiente','confirmada')
        AND tstzrange(r.inicio, r.fin, '[)') && tstzrange((:ini AT TIME ZONE 'America/Santiago')::timestamptz,
                                                         (:fin AT TIME ZONE 'America/Santiago')::timestamptz, '[)')
        {excluir}
    ) AS ok;
    """.format(excluir="AND r.id_reserva <> :excluir_id" if excluir_id else "")
    params = {"id_cancha": id_cancha, "ini": ts_ini, "fin": ts_fin}
    if excluir_id: params["excluir_id"] = excluir_id
    return bool(db.execute(text(q), params).scalar())

def crear(db: Session, id_usuario: int, body: Dict[str, Any]) -> Dict[str, Any]:
    ts_ini = _mk_ts(body["fecha"], body["inicio"])
    ts_fin = _mk_ts(body["fecha"], body["fin"])
    if existe_solape(db, body["id_cancha"], ts_ini, ts_fin):
        raise ValueError("La cancha no está disponible en ese horario")

    q = """
    INSERT INTO reservas (id_cancha, id_usuario, inicio, fin, estado, precio_total, notas)
    VALUES (
      :id_cancha, :id_usuario,
      (:ini AT TIME ZONE 'America/Santiago')::timestamptz,
      (:fin AT TIME ZONE 'America/Santiago')::timestamptz,
      'pendiente', :precio_total, :notas
    )
    RETURNING id_reserva;
    """
    params = {
        "id_cancha": body["id_cancha"],
        "id_usuario": id_usuario,
        "ini": ts_ini,
        "fin": ts_fin,
        "precio_total": body.get("precio_total"),
        "notas": body.get("notas")
    }
    new_id = db.execute(text(q), params).scalar()
    db.commit()
    # ✅ llamar con la firma correcta
    return detalle(db, new_id)


def detalle(db: Session, id_reserva: int) -> Optional[Dict[str, Any]]:
    q = _DEF_SELECT + " WHERE r.id_reserva = :id_reserva"
    row = db.execute(text(q), {"id_reserva": id_reserva}).mappings().first()
    return dict(row) if row else None

def mias(db: Session, user_id: int) -> List[Dict[str, Any]]:
    q = _DEF_SELECT + " WHERE r.id_usuario = :uid ORDER BY r.inicio DESC"
    return [dict(r) for r in db.execute(text(q), {"uid": user_id}).mappings().all()]

def listar_admin_owner(db: Session, filtros: Dict[str, Any]) -> List[Dict[str, Any]]:
    # si recibes owner_id, filtra por canchas del dueño
    wh = []
    p = {}
    if filtros.get("estado"):
        wh.append("r.estado = :estado"); p["estado"] = filtros["estado"]
    if filtros.get("desde"):
        wh.append("r.inicio >= (:desde AT TIME ZONE 'America/Santiago')::timestamptz"); p["desde"] = f"{filtros['desde']} 00:00"
    if filtros.get("hasta"):
        wh.append("r.fin <= (:hasta AT TIME ZONE 'America/Santiago')::timestamptz");   p["hasta"]  = f"{filtros['hasta']} 23:59"
    if filtros.get("id_cancha"):
        wh.append("r.id_cancha = :id_cancha"); p["id_cancha"] = filtros["id_cancha"]
    if filtros.get("id_complejo"):
        wh.append("r.id_cancha IN (SELECT id_cancha FROM canchas WHERE id_complejo = :id_complejo)")
        p["id_complejo"] = filtros["id_complejo"]
    if filtros.get("owner_id"):
        wh.append("r.id_cancha IN (SELECT c.id_cancha FROM canchas c JOIN complejos x ON x.id_complejo=c.id_complejo WHERE x.id_dueno=:owner_id)")
        p["owner_id"] = filtros["owner_id"]
    where = (" WHERE " + " AND ".join(wh)) if wh else ""
    q = _DEF_SELECT + where + " ORDER BY r.inicio DESC LIMIT 500"
    return [dict(r) for r in db.execute(text(q), p).mappings().all()]

def actualizar(db: Session, id_reserva: int, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # Permite reprogramar y/o notas
    # Si cambian fecha/horas, validamos disponibilidad
    fields = []
    p = {"id_reserva": id_reserva}
    if all(k in payload for k in ("fecha","inicio","fin")):
        ts_ini = _mk_ts(payload["fecha"], payload["inicio"])
        ts_fin = _mk_ts(payload["fecha"], payload["fin"])
        # Traer id_cancha actual
        id_cancha = db.execute(text("SELECT id_cancha FROM reservas WHERE id_reserva=:id"), {"id": id_reserva}).scalar()
        if id_cancha and existe_solape(db, id_cancha, ts_ini, ts_fin, excluir_id=id_reserva):
            raise ValueError("La cancha no está disponible en ese horario")
        fields.append("inicio = (:ini AT TIME ZONE 'America/Santiago')::timestamptz")
        fields.append("fin    = (:fin  AT TIME ZONE 'America/Santiago')::timestamptz")
        p["ini"] = ts_ini; p["fin"] = ts_fin
    if "notas" in payload and payload["notas"] is not None:
        fields.append("notas = :notas"); p["notas"] = payload["notas"]
    if not fields:
        return detalle(db, id_reserva)

    q = "UPDATE reservas SET " + ", ".join(fields) + ", updated_at = NOW() WHERE id_reserva=:id_reserva"
    db.execute(text(q), p); db.commit()
    return detalle(db, id_reserva)

def cambio_estado(db: Session, id_reserva: int, nuevo: str) -> Optional[Dict[str, Any]]:
    q = "UPDATE reservas SET estado = :e, updated_at = NOW() WHERE id_reserva=:id RETURNING id_reserva"
    rid = db.execute(text(q), {"e": nuevo, "id": id_reserva}).scalar()
    db.commit()
    return detalle(db, rid) if rid else None

# ====== Cotización ======

def _duracion_horas(db: Session, fecha: str, h_ini: str, h_fin: str) -> float:
    # Devuelve horas (ej: 1.5)
    r = db.execute(text("""
        SELECT EXTRACT(EPOCH FROM ((:fecha||' '||:fin)::time - (:fecha||' '||:ini)::time))/3600.0
    """), {"fecha": fecha, "ini": h_ini, "fin": h_fin}).scalar()
    return float(r or 0.0)

def precio_por_hora(db: Session, id_cancha: int, fecha: str, h_ini: str, h_fin: str) -> Optional[float]:
    """
    Devuelve el precio por hora vigente para la cancha y franja solicitada.
    IMPORTANTE: usar CAST(:param AS type) y bindear TODOS los params.
    """
    r = db.execute(text("""
        SELECT rp.precio_por_hora
        FROM reglas_precio rp
        WHERE rp.id_cancha = :id_cancha
          AND (rp.vigente_desde IS NULL OR rp.vigente_desde <= CAST(:fecha AS date))
          AND (rp.vigente_hasta IS NULL OR rp.vigente_hasta >= CAST(:fecha AS date))
          AND (CAST(:ini AS time) >= rp.hora_inicio AND CAST(:ini AS time) < rp.hora_fin)
        ORDER BY rp.vigente_desde NULLS FIRST, rp.updated_at DESC
        LIMIT 1
    """), {
        "id_cancha": id_cancha,
        "fecha": fecha,   # "YYYY-MM-DD"
        "ini":   h_ini    # "HH:MM"
    }).scalar() 
    return float(r) if r is not None else None

def promo_aplicable(db: Session, id_cancha: int, fecha: str) -> Optional[dict]:
    # Busca promo activa por cancha o por el complejo dueño de esa cancha
    r = db.execute(text("""
        WITH c AS (
          SELECT id_complejo
          FROM canchas
          WHERE id_cancha = :id_cancha
        )
        SELECT p.tipo::text, p.valor::float, p.titulo
        FROM promociones p
        WHERE p.estado = 'activa'
          AND (
                (p.id_cancha   IS NOT NULL AND p.id_cancha   = :id_cancha)
             OR (p.id_complejo IS NOT NULL AND p.id_complejo = (SELECT id_complejo FROM c))
          )
          AND (p.vigente_desde IS NULL OR p.vigente_desde <= CAST(:fecha AS date))
          AND (p.vigente_hasta IS NULL OR p.vigente_hasta >= CAST(:fecha AS date))
        ORDER BY p.updated_at DESC
        LIMIT 1
    """), {
        "id_cancha": id_cancha,
        "fecha": fecha  # <-- ¡bind!
    }).mappings().first()
    return dict(r) if r else None

def cotizar(db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
    horas = _duracion_horas(db, payload["fecha"], payload["inicio"], payload["fin"])
    pph = precio_por_hora(db, payload["id_cancha"], payload["fecha"], payload["inicio"], payload["fin"]) or 0.0
    subtotal = round(pph * horas, 2)
    promo = promo_aplicable(db, payload["id_cancha"], payload["fecha"])
    descuento = 0.0
    detalle = None
    if promo:
        if promo["tipo"] == "porcentaje":
            descuento = round(subtotal * (promo["valor"]/100.0), 2)
        else:
            descuento = min(subtotal, round(promo["valor"], 2))
        detalle = promo.get("titulo")
    total = round(max(0.0, subtotal - descuento), 2)
    return {"moneda": "CLP", "subtotal": subtotal, "descuento": descuento, "total": total, "detalle": detalle}
def listar_admin(db, admin_id: int, filtros: dict):
    """
    Lista reservas SOLO del complejo del admin y sus canchas.
    Asumimos esquema: complejos(id_complejo, id_admin) y canchas(id_cancha, id_complejo)
    """
    wh = []
    p = {"admin_id": admin_id}

    # restringimos a su complejo y canchas
    wh.append("""
      r.id_cancha IN (
        SELECT c.id_cancha
        FROM canchas c
        JOIN complejos x ON x.id_complejo = c.id_complejo
        WHERE x.id_admin = :admin_id
      )
    """)

    if filtros.get("estado"):
        wh.append("r.estado = :estado"); p["estado"] = filtros["estado"]
    if filtros.get("desde"):
        wh.append("r.inicio >= (:desde AT TIME ZONE 'America/Santiago')::timestamptz")
        p["desde"] = f"{filtros['desde']} 00:00"
    if filtros.get("hasta"):
        wh.append("r.fin <= (:hasta AT TIME ZONE 'America/Santiago')::timestamptz")
        p["hasta"] = f"{filtros['hasta']} 23:59"
    if filtros.get("id_cancha"):
        # valida que esa cancha sea del admin (queda implícito por la clausula principal)
        wh.append("r.id_cancha = :id_cancha"); p["id_cancha"] = filtros["id_cancha"]
    if filtros.get("id_complejo"):
        # fuerza que el complejo consultado también sea del admin
        wh.append("""
          r.id_cancha IN (
            SELECT c2.id_cancha
            FROM canchas c2
            WHERE c2.id_complejo = :id_complejo
          )
        """); p["id_complejo"] = filtros["id_complejo"]

    where = " WHERE " + " AND ".join(wh)
    q = _DEF_SELECT + where + " ORDER BY r.inicio DESC LIMIT 500"
    return [dict(r) for r in db.execute(text(q), p).mappings().all()]

def pertenece_a_admin(db, id_reserva: int, admin_id: int) -> bool:
    q = """
    SELECT EXISTS (
      SELECT 1
      FROM reservas r
      JOIN canchas c ON c.id_cancha = r.id_cancha
      JOIN complejos x ON x.id_complejo = c.id_complejo
      WHERE r.id_reserva = :id_reserva
        AND x.id_admin = :admin_id
    )
    """
    return bool(db.execute(text(q), {"id_reserva": id_reserva, "admin_id": admin_id}).scalar())

def listar_superadmin(db, filtros: dict):
    wh, p = [], {}
    if filtros.get("estado"):
        wh.append("r.estado = :estado"); p["estado"] = filtros["estado"]
    if filtros.get("desde"):
        wh.append("r.inicio >= (:desde AT TIME ZONE 'America/Santiago')::timestamptz")
        p["desde"] = f"{filtros['desde']} 00:00"
    if filtros.get("hasta"):
        wh.append("r.fin <= (:hasta AT TIME ZONE 'America/Santiago')::timestamptz")
        p["hasta"]  = f"{filtros['hasta']} 23:59"
    if filtros.get("id_cancha"):
        wh.append("r.id_cancha = :id_cancha"); p["id_cancha"] = filtros["id_cancha"]
    if filtros.get("id_complejo"):
        wh.append("r.id_cancha IN (SELECT id_cancha FROM canchas WHERE id_complejo = :id_complejo)")
        p["id_complejo"] = filtros["id_complejo"]

    where = (" WHERE " + " AND ".join(wh)) if wh else ""
    q = _DEF_SELECT + where + " ORDER BY r.inicio DESC LIMIT 1000"
    return [dict(r) for r in db.execute(text(q), p).mappings().all()]