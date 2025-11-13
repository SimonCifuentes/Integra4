# app/modules/notificaciones/service.py
from __future__ import annotations
from typing import List, Optional
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.modules.auth.model import Usuario
from app.modules.reservas.model import Reserva
from zoneinfo import ZoneInfo

from .schemas import (
    NotificacionCreateIn,
    NotificacionOut,
    NotificacionEmailIn,
)
from . import repository as repo
from app.core import mailer  # 👈 tu mailer
CL_TZ = ZoneInfo("America/Santiago")

class NotificacionesService:
    # ----------- CRUD básicos (in-app) ------------------

    @staticmethod
    def crear(db: Session, data: NotificacionCreateIn) -> NotificacionOut:
        row = repo.crear(db, data.model_dump())
        return NotificacionOut.model_validate(row)

    @staticmethod
    def listar_para_usuario(
        db: Session,
        id_usuario: int,
        solo_no_leidas: bool = False,
    ) -> List[NotificacionOut]:
        rows = repo.listar_por_usuario(db, id_usuario, solo_no_leidas=solo_no_leidas)
        return [NotificacionOut.model_validate(r) for r in rows]

    @staticmethod
    def obtener(
        db: Session,
        id_notificacion: int,
    ) -> Optional[NotificacionOut]:
        row = repo.obtener_por_id(db, id_notificacion)
        return NotificacionOut.model_validate(row) if row else None

    @staticmethod
    def marcar_leida(
        db: Session,
        id_notificacion: int,
        id_usuario: int,
    ) -> Optional[NotificacionOut]:
        row = repo.marcar_leida(db, id_notificacion, id_usuario)
        return NotificacionOut.model_validate(row) if row else None

    @staticmethod
    def marcar_todas_leidas(
        db: Session,
        id_usuario: int,
    ) -> int:
        return repo.marcar_todas_leidas(db, id_usuario)

    # ----------- EMAIL: crear + enviar ------------------

    @staticmethod
    def _obtener_correo_usuario(db: Session, id_usuario: int) -> Optional[str]:
        """
        Usa el modelo Usuario para obtener el correo/email del usuario,
        sin asumir el nombre exacto de la columna en la BD.
        """
        user: Usuario | None = db.get(Usuario, id_usuario)
        if not user:
            return None

        # Preferimos atributo 'correo', pero si tu modelo usa 'email' también lo cubrimos.
        if hasattr(user, "correo") and getattr(user, "correo"):
            return getattr(user, "correo")
        if hasattr(user, "email") and getattr(user, "email"):
            return getattr(user, "email")

        return None

    @classmethod
    def crear_y_enviar_email(
        cls,
        db: Session,
        payload: NotificacionEmailIn,
    ) -> NotificacionOut:
        correo = cls._obtener_correo_usuario(db, payload.id_destinatario)
        if not correo:
            raise ValueError("El destinatario no tiene correo registrado")

        data = NotificacionCreateIn(
            id_destinatario=payload.id_destinatario,
            titulo=payload.titulo,
            cuerpo=payload.cuerpo,
        )
        notif = cls.crear(db, data)

        # usa tu mailer.py
        mailer.send_notification(
            to=correo,
            subject=payload.titulo,
            body=payload.cuerpo,
        )

        return notif
    
    @staticmethod
    def _obtener_reserva_basica(db: Session, id_reserva: int) -> Optional[dict]:
        """
        Trae datos mínimos de la reserva para armar el mensaje.
        Usa la tabla `reservas` del schema.
        """
        sql = text("""
            SELECT
              id_reserva,
              id_usuario,
              fecha_reserva,
              hora_inicio,
              hora_fin,
              estado
            FROM reservas
            WHERE id_reserva = :id
        """)
        row = db.execute(sql, {"id": id_reserva}).mappings().first()
        return dict(row) if row else None

    # ---------- 2. NOTIFICACIÓN AL CREAR RESERVA ----------

    @classmethod
    def notificar_reserva_creada(cls, db: Session, id_reserva: int) -> NotificacionOut:
        reserva: Reserva | None = db.get(Reserva, id_reserva)
        if not reserva:
            raise ValueError("Reserva no encontrada")

        ini_local = reserva.inicio.astimezone(CL_TZ)
        fin_local = reserva.fin.astimezone(CL_TZ)

        fecha = ini_local.date()
        hora_ini = ini_local.strftime("%H:%M")
        hora_fin = fin_local.strftime("%H:%M")

        titulo = f"[Reserva creada] Reserva #{reserva.id_reserva}"
        cuerpo = (
            f"Tu reserva (ID {reserva.id_reserva}) para el {fecha} "
            f"desde las {hora_ini} hasta las {hora_fin} ha sido creada correctamente."
        )

        notif_data = NotificacionCreateIn(
            id_destinatario=reserva.id_usuario,
            titulo=titulo,
            cuerpo=cuerpo,
        )
        notif = cls.crear(db, notif_data)  # usa tu método crear() ya existente

        correo = cls._obtener_correo_usuario(db, reserva.id_usuario)
        if correo:
            mailer.send_notification(
                to=correo,
                subject="Reserva creada – SportHub Temuco",
                body=cuerpo,
            )

        return notif

    @classmethod
    def notificar_reserva_confirmada(cls, db: Session, id_reserva: int) -> NotificacionOut:
        reserva: Reserva | None = db.get(Reserva, id_reserva)
        if not reserva:
            raise ValueError("Reserva no encontrada")

        ini_local = reserva.inicio.astimezone(CL_TZ)
        fecha = ini_local.date()
        hora_ini = ini_local.strftime("%H:%M")

        titulo = f"[Reserva confirmada] Reserva #{reserva.id_reserva}"
        cuerpo = (
            f"Tu reserva (ID {reserva.id_reserva}) para el {fecha} a las {hora_ini} "
            "ha sido CONFIRMADA. Te esperamos en el complejo."
        )

        notif_data = NotificacionCreateIn(
            id_destinatario=reserva.id_usuario,
            titulo=titulo,
            cuerpo=cuerpo,
        )
        notif = cls.crear(db, notif_data)

        correo = cls._obtener_correo_usuario(db, reserva.id_usuario)
        if correo:
            mailer.send_notification(
                to=correo,
                subject="Reserva confirmada – SportHub Temuco",
                body=cuerpo,
            )

        return notif
