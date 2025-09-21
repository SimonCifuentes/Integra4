from __future__ import annotations
from sqlalchemy.orm import Session
from app.modules.reservas.schemas import ReservaCreateIn
from app.modules.reservas import repository as repo

class Service:
    @staticmethod
    def crear(db: Session, *, user_id: int, data: ReservaCreateIn):
        return repo.create_reserva(
            db,
            id_usuario=user_id,
            id_cancha=data.id_cancha,
            fecha=data.fecha_reserva,
            h_ini=data.hora_inicio,
            h_fin=data.hora_fin,
        )

    @staticmethod
    def mias(db: Session, *, user_id: int):
        return repo.list_mis_reservas(db, id_usuario=user_id)

    @staticmethod
    def cancelar(db: Session, *, user_id: int, reserva_id: int):
        return repo.cancelar_reserva(db, id_usuario=user_id, id_reserva=reserva_id)
