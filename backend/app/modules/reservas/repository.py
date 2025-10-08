from __future__ import annotations
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Any, Dict, List, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings                 # ← para IVA y política neto/bruto


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

# ====== Motor de precios (helpers) ======

def _fetch_reglas_vigentes(db: Session, id_cancha: int, dow: str) -> List[Dict[str, Any]]:
    """
    Trae reglas vigentes para la fecha actual y el día de semana dado (enum en español).
    Preferencia: reglas con 'dia' específico > 'dia' NULL; luego más recientes; luego menor precio.
    """
    sql = text("""
        SELECT id_regla, dia, hora_inicio, hora_fin, precio_por_hora, vigente_desde, vigente_hasta
        FROM reglas_precio
        WHERE id_cancha = :idc
          AND (dia IS NULL OR dia = :dow)
          AND (vigente_desde IS NULL OR vigente_desde <= CURRENT_DATE)
          AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
        ORDER BY
          CASE WHEN dia IS NULL THEN 1 ELSE 0 END,  -- pref. específica
          vigente_desde DESC NULLS LAST,
          precio_por_hora ASC
    """)
    rows = db.execute(sql, {"idc": id_cancha, "dow": dow}).mappings().all()
    return [dict(r) for r in rows]

def _match_regla(reglas: List[Dict[str, Any]], t: datetime) -> Optional[Dict[str, Any]]:
    """
    Encuentra la regla cuya franja [hora_inicio, hora_fin) contiene al instante t.
    """
    for r in reglas:
        hi = datetime(t.year, t.month, t.day, r["hora_inicio"].hour, r["hora_inicio"].minute, tzinfo=_TZ)
        hf = datetime(t.year, t.month, t.day, r["hora_fin"].hour,   r["hora_fin"].minute,   tzinfo=_TZ)
        if hi <= t < hf:
            return r
    return None

def compute_total_reserva(db: Session, *, id_cancha: int, inicio: datetime, fin: datetime) -> Dict[str, Any]:
    """
    Segmenta la franja [inicio, fin) por cambios de regla de precio y calcula:
      - neto (si PRECIOS_INCLUYEN_IVA=False) o neteado (si vienen con IVA),
      - iva (según IVA_PERCENT),
      - total (redondeado a entero CLP).
    Retorna además el desglose por segmentos.
    """
    if fin <= inicio:
        raise ValueError("hora_fin debe ser > hora_inicio")

    # map inglés->español para enum 'dia_semana' de la DB
    mapa = {
        "monday": "lunes",
        "tuesday": "martes",
        "wednesday": "miercoles",
        "thursday": "jueves",
        "friday": "viernes",
        "saturday": "sabado",
        "sunday": "domingo",
    }
    dow = mapa[inicio.strftime("%A").lower()]

    reglas = _fetch_reglas_vigentes(db, id_cancha, dow)

    cursor = inicio
    segmentos: List[Dict[str, Any]] = []
    while cursor < fin:
        r = _match_regla(reglas, cursor)
        if not r:
            # Sin regla: tramo de 15' con precio 0 (puedes cambiar a raise si prefieres bloquear)
            next_cut = cursor + timedelta(minutes=15)
            price = 0.0
        else:
            hf = datetime(cursor.year, cursor.month, cursor.day, r["hora_fin"].hour, r["hora_fin"].minute, tzinfo=_TZ)
            next_cut = min(fin, hf)
            price = float(r["precio_por_hora"])

        minutos = int((next_cut - cursor).total_seconds() // 60)
        if minutos > 0:
            subtotal_neto = round(price * (minutos / 60.0), 2)
            segmentos.append({
                "desde": cursor.strftime("%H:%M"),
                "hasta": next_cut.strftime("%H:%M"),
                "minutos": minutos,
                "precio_por_hora": price,
                "subtotal_neto": subtotal_neto,
            })
        cursor = next_cut

    neto = round(sum(s["subtotal_neto"] for s in segmentos), 2)

    if settings.PRECIOS_INCLUYEN_IVA:
        # precios vienen con IVA: backout
        total = neto
        base  = round(neto / (1 + settings.IVA_PERCENT / 100.0), 2)
        iva   = round(neto - base, 2)
        neto  = base
    else:
        # precios netos: agregar IVA
        iva   = round(neto * (settings.IVA_PERCENT / 100.0), 2)
        total = round(neto + iva, 2)

    # Presentación CLP entero
    total = float(round(total))
    iva   = float(round(total - neto))

    return {
        "segmentos": segmentos,
        "neto": float(round(neto, 2)),
        "iva": iva,
        "total": total,
    }

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

    # === calcular precio_total usando reglas ===
    pricing = compute_total_reserva(db, id_cancha=id_cancha, inicio=inicio, fin=fin)
    precio_total = pricing["total"]

    sql = text(
        """
        INSERT INTO reservas (id_cancha, id_usuario, inicio, fin, estado, precio_total)
        VALUES (:id_cancha, :id_usuario, :inicio, :fin, 'confirmada', :precio_total)
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
            "precio_total": precio_total,
        }).mappings().one()
        db.commit()
        # Si quieres devolver desglose de precio para debug/FE, puedes unirlo aquí:
        # return dict(row) | {"pricing": pricing}
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
