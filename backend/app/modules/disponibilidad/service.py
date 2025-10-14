from datetime import date, timedelta
from sqlalchemy.orm import Session
from .repository import slots_para_fecha

def disponibilidad_por_dia(db: Session, id_cancha: int, d: date, slot_min: int):
    return slots_para_fecha(db, id_cancha, d, slot_min)

def disponibilidad_rango(db: Session, id_cancha: int, d1: date, d2: date, slot_min: int):
    cur, out = d1, {}
    while cur <= d2:
        out[str(cur)] = disponibilidad_por_dia(db, id_cancha, cur, slot_min)
        cur += timedelta(days=1)
    return out
