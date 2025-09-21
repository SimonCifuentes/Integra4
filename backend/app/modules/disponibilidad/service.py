from __future__ import annotations
from sqlalchemy.orm import Session
from app.modules.disponibilidad import repository as repo

class Service:
    @staticmethod
    def slots(db: Session, *, id_cancha: int, fecha, slot_min: int):
        return repo.slots_disponibles(db, id_cancha=id_cancha, fecha=fecha, slot_min=slot_min)
