from __future__ import annotations
from datetime import datetime, timedelta, time, date
from zoneinfo import ZoneInfo
from typing import List, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

_TZ = ZoneInfo("America/Santiago")
_DIAS = {0:"lunes",1:"martes",2:"miercoles",3:"jueves",4:"viernes",5:"sabado",6:"domingo"}

def _tile(start: time, end: time, step_min: int) -> List[Tuple[time,time]]:
    res, dt, dt_end, step = [], datetime.combine(date.today(), start), datetime.combine(date.today(), end), timedelta(minutes=step_min)
    while dt + step <= dt_end:
        res.append((dt.time(), (dt + step).time()))
        dt += step
    return res

def _dia(d: date) -> str: return _DIAS[d.weekday()]

def _horario_del_dia(db: Session, id_cancha: int, d: date):
    # horario por cancha o, si no existe, del complejo de la cancha
    q = text("""
        WITH c AS (SELECT id_cancha, id_complejo FROM canchas WHERE id_cancha = :id_cancha)
        SELECT h.hora_apertura, h.hora_cierre
        FROM horarios_atencion h
        JOIN c ON (h.id_cancha IS NULL OR h.id_cancha = c.id_cancha)
        WHERE h.dia = :dia
          AND (h.id_cancha = c.id_cancha OR (h.id_cancha IS NULL AND h.id_complejo = c.id_complejo))
        ORDER BY (h.id_cancha IS NOT NULL) DESC
        LIMIT 1
    """)
    return db.execute(q, {"id_cancha": id_cancha, "dia": _dia(d)}).one_or_none()

def _rangos_ocupados(db: Session, id_cancha: int, d: date):
    """
    Devuelve rangos ocupados (hora_local inicio/fin) dentro del día d para la cancha.
    Considera bloqueos y reservas (pendiente/confirmada) que INTERSECTEN el día.
    """
    # límites del día en tz local
    day_start = datetime(d.year, d.month, d.day, 0, 0, tzinfo=_TZ)
    day_end   = day_start + timedelta(days=1)

    q = text("""
        SELECT
          -- recorta a los límites del día y pasa a hora local del día
          (GREATEST(inicio, :t0) AT TIME ZONE 'America/Santiago')::time AS hi,
          (LEAST(fin,    :t1)    AT TIME ZONE 'America/Santiago')::time AS hf
        FROM (
          SELECT inicio, fin
          FROM bloqueos
          WHERE id_cancha = :id_cancha
            AND tstzrange(inicio, fin, '[)') && tstzrange(:t0, :t1, '[)')
          UNION ALL
          SELECT inicio, fin
          FROM reservas
          WHERE id_cancha = :id_cancha
            AND estado IN ('pendiente','confirmada')
            AND tstzrange(inicio, fin, '[)') && tstzrange(:t0, :t1, '[)')
        ) x
        -- asegura que el recorte no quede vacío
        WHERE (LEAST(fin, :t1)) > (GREATEST(inicio, :t0))
        ORDER BY 1
    """)
    rows = db.execute(q, {"id_cancha": id_cancha, "t0": day_start, "t1": day_end}).all()
    return [(r[0], r[1]) for r in rows]

def _merge(ranges: List[Tuple[time,time]]):
    if not ranges: return []
    ranges = sorted(ranges)
    out = [[ranges[0][0], ranges[0][1]]]
    for s,e in ranges[1:]:
        if s <= out[-1][1]:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s,e])
    return [(a,b) for a,b in out]

def _restar(base: List[Tuple[time,time]], oc: List[Tuple[time,time]]) -> List[Tuple[time,time]]:
    libres = []
    for b_ini, b_fin in base:
        cur = b_ini
        for o_ini, o_fin in oc:
            if o_fin <= cur or o_ini >= b_fin: continue
            if o_ini > cur: libres.append((cur, o_ini))
            cur = max(cur, o_fin)
            if cur >= b_fin: break
        if cur < b_fin: libres.append((cur, b_fin))
    return libres

def _reglas_precio(db: Session, id_cancha: int, d: date):
    q = text("""
        SELECT hora_inicio, hora_fin, precio_por_hora
        FROM reglas_precio
        WHERE id_cancha = :id_cancha
          AND (dia IS NULL OR dia = :dia)
          AND (vigente_desde IS NULL OR :d >= vigente_desde)
          AND (vigente_hasta IS NULL OR :d <= vigente_hasta)
        ORDER BY hora_inicio
    """)
    return db.execute(q, {"id_cancha": id_cancha, "dia": _dia(d), "d": d}).all()

def _precio_slot(reglas, ini: time, fin: time, slot_min: int):
    for hi, hf, pph in reglas:
        if hi <= ini and hf >= fin:
            return float(pph) * (slot_min/60.0)
    return None

def slots_para_fecha(db: Session, id_cancha: int, d: date, slot_min: int):
    h = _horario_del_dia(db, id_cancha, d)
    if not h: return []
    apertura, cierre = h

    ocup = _merge(_rangos_ocupados(db, id_cancha, d))
    ventanas = _restar([(apertura, cierre)], ocup)

    reglas = _reglas_precio(db, id_cancha, d)
    out = []
    for win_ini, win_fin in ventanas:
        for ini, fin in _tile(win_ini, win_fin, slot_min):
            s = datetime.combine(d, ini).replace(tzinfo=_TZ)
            e = datetime.combine(d, fin).replace(tzinfo=_TZ)
            out.append({
                "inicio": s, "fin": e,
                "etiqueta": f"{ini.strftime('%H:%M')}–{fin.strftime('%H:%M')}",
                "precio": _precio_slot(reglas, ini, fin, slot_min)
            })
    return out
