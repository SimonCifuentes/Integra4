from __future__ import annotations
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from typing import List, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

_TZ = ZoneInfo("America/Santiago")
_DIAS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]

def _get_complejo_id(db: Session, id_cancha: int) -> int | None:
    row = db.execute(text("SELECT id_complejo FROM canchas WHERE id_cancha=:c"), {"c": id_cancha}).first()
    return row[0] if row else None

def _get_ventana_horaria(db: Session, id_cancha: int, fecha) -> Tuple[time, time]:
    dia = _DIAS[fecha.weekday()]
    id_complejo = _get_complejo_id(db, id_cancha)
    # 1) horario específico de la cancha
    row = db.execute(text(
        """
        SELECT hora_apertura, hora_cierre FROM horarios_atencion
         WHERE id_cancha=:c AND dia=:d
         ORDER BY id_horario DESC LIMIT 1
        """
    ), {"c": id_cancha, "d": dia}).first()
    if row:
        return row[0], row[1]
    # 2) horario general del complejo
    if id_complejo is not None:
        row = db.execute(text(
            """
            SELECT hora_apertura, hora_cierre FROM horarios_atencion
             WHERE id_cancha IS NULL AND id_complejo=:x AND dia=:d
             ORDER BY id_horario DESC LIMIT 1
            """
        ), {"x": id_complejo, "d": dia}).first()
        if row:
            return row[0], row[1]
    # 3) por defecto
    return time(8, 0), time(22, 0)

def _intervalos_ocupados(db: Session, id_cancha: int, fecha) -> List[Tuple[datetime, datetime]]:
    start = datetime.combine(fecha, time(0, 0)).replace(tzinfo=_TZ)
    end   = start + timedelta(days=1)
    rows_r = db.execute(text(
        """
        SELECT inicio, fin FROM reservas
         WHERE id_cancha=:c AND estado IN ('pendiente','confirmada')
           AND NOT (fin<=:start OR inicio>=:end)
        """
    ), {"c": id_cancha, "start": start, "end": end}).all()

    rows_b = []
    try:
        rows_b = db.execute(text(
            """
            SELECT inicio, fin FROM bloqueos
             WHERE id_cancha=:c
               AND NOT (fin<=:start OR inicio>=:end)
            """
        ), {"c": id_cancha, "start": start, "end": end}).all()
    except Exception:
        rows_b = []

    return [(r[0], r[1]) for r in (*rows_r, *rows_b)]

def slots_disponibles(db: Session, *, id_cancha: int, fecha, slot_min: int) -> List[Tuple[str, str]]:
    h_ap, h_cie = _get_ventana_horaria(db, id_cancha, fecha)
    win_start = datetime.combine(fecha, h_ap).replace(tzinfo=_TZ)
    win_end   = datetime.combine(fecha, h_cie).replace(tzinfo=_TZ)

    ocupados = _intervalos_ocupados(db, id_cancha, fecha)

    def libre(a: datetime, b: datetime) -> bool:
        for (x, y) in ocupados:
            if not (b <= x or a >= y):
                return False
        return True

    slots: List[Tuple[str, str]] = []
    cur = win_start
    step = timedelta(minutes=slot_min)
    while cur + step <= win_end:
        nxt = cur + step
        if libre(cur, nxt):
            slots.append((cur.strftime('%H:%M'), nxt.strftime('%H:%M')))
        cur = nxt
    return slots
