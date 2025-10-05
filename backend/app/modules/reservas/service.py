from __future__ import annotations
from sqlalchemy.orm import Session
from app.modules.reservas.schemas import ReservaCreateIn
from app.modules.reservas import repository as repo

class Service:
    @staticmethod
    def crear(db: Session, *, user_id: int, data: ReservaCreateIn):
        """
        Crea una reserva confirmada (usa constraints para evitar solapes).
        """
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
        """
        Lista las últimas reservas del usuario.
        """
        return repo.list_mis_reservas(db, id_usuario=user_id)

    # ====== Compatibilidad con tu código existente ======
    @staticmethod
    def cancelar(db: Session, *, user_id: int, reserva_id: int):
        """
        COMPAT: mantiene la firma original.
        - Devuelve dict si canceló.
        - Devuelve None si no pudo (pertenencia/estado/ya empezó).
        """
        return repo.cancelar_reserva(db, id_usuario=user_id, id_reserva=reserva_id)

    # ====== Nuevo: cancelación con reglas y errores explícitos ======
    @staticmethod
    def cancelar_mia(db: Session, *, user_id: int, reserva_id: int):
        """
        Cancela una reserva propia solo si:
        - Existe y pertenece al usuario
        - Estado en ('pendiente','confirmada')
        - Aún NO ha comenzado
        Devuelve dict o {"error": "..."} para que el router mapee HTTP 4xx.
        """
        return repo.cancelar_reserva_usuario(
            db, id_usuario=user_id, id_reserva=reserva_id
        )

    @staticmethod
    def cancelar_por_actor(
        db: Session, *, actor_id: int, reserva_id: int, is_admin: bool = False
    ):
        """
        Cancela como DUEÑO o ADMIN/SUPERADMIN.
        - Si is_admin=True: puede cancelar cualquiera.
        - Si is_admin=False: debe ser dueño del complejo de la reserva.
        - Estado en ('pendiente','confirmada'). (Política: permitimos aunque ya iniciada, ajústalo en repo si no).
        Devuelve dict o {"error": "..."}.
        """
        return repo.cancelar_reserva_por_actor(
            db, actor_id=actor_id, id_reserva=reserva_id, is_admin=is_admin
        )
