# app/modules/denuncias/service.py
from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

from .schemas import DenunciaCreateIn, DenunciaAdminReplyIn, EstadoDenuncia
from . import repository as repo


class DenunciasService:
    """
    Capa de servicio para encapsular la lógica de denuncias / soporte.

    Aquí podrías agregar:
    - Envío de correos al super admin.
    - Creación de notificaciones in-app.
    - Reglas adicionales (por ejemplo, limitar denuncias duplicadas).
    """

    # --------------------- USUARIO ---------------------

    @staticmethod
    def crear_denuncia(
        db: Session,
        id_reportante: int,
        data: DenunciaCreateIn,
    ) -> dict:
        """
        Crea una nueva denuncia asociada al usuario que la está enviando.
        """
        denuncia = repo.crear_denuncia(db, id_reportante=id_reportante, data=data)

        # Aquí podrías disparar notificación/correo al super admin si quieres.
        # DenunciasService._notificar_super_admin_nueva_denuncia(db, denuncia)

        return denuncia

    @staticmethod
    def listar_mis_denuncias(
        db: Session,
        id_reportante: int,
    ) -> list[dict]:
        """
        Devuelve todas las denuncias creadas por un usuario (para su panel 'Mis denuncias').
        """
        return repo.listar_denuncias_usuario(db, id_reportante=id_reportante)

    # --------------------- ADMIN / SUPER ADMIN ---------------------

    @staticmethod
    def listar_denuncias_admin(
        db: Session,
        estado: Optional[EstadoDenuncia],
        categoria: Optional[str],
        tipo_mensaje: Optional[str],
    ) -> list[dict]:
        """
        Lista denuncias para el panel del super admin con filtros opcionales.
        """
        return repo.listar_denuncias_admin(
            db,
            estado=estado,
            categoria=categoria,
            tipo_mensaje=tipo_mensaje,
        )

    @staticmethod
    def obtener_denuncia(
        db: Session,
        id_denuncia: int,
    ) -> Optional[dict]:
        """
        Obtiene una denuncia por ID.
        """
        return repo.obtener_denuncia(db, id_denuncia)

    @staticmethod
    def responder_denuncia(
        db: Session,
        id_denuncia: int,
        id_admin: int,
        data: DenunciaAdminReplyIn,
    ) -> Optional[dict]:
        """
        Permite al super admin responder una denuncia y actualizar su estado.
        """
        denuncia = repo.responder_denuncia(db, id_denuncia, id_admin, data)

        # Aquí podrías notificar al usuario que su denuncia fue respondida.
        # DenunciasService._notificar_usuario_respuesta(db, denuncia)

        return denuncia
