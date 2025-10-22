# app/modules/resenas/service.py
from __future__ import annotations
from typing import Optional
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import settings  # <— IMPORTANTE

from .schemas import ResenaCreateIn, ResenaUpdateIn
from . import repository as repo


class Service:
    # -------------------- utils --------------------
    @staticmethod
    def _normalize_ids(id_cancha: Optional[int], id_complejo: Optional[int]) -> tuple[Optional[int], Optional[int]]:
        """Convierte 0 → None para requests desde Swagger/UI."""
        return (id_cancha or None, id_complejo or None)

    @staticmethod
    def _column_exists(db: Session, table: str, column: str) -> bool:
        sql = """
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = :t AND column_name = :c
        LIMIT 1
        """
        return db.execute(text(sql), {"t": table, "c": column}).first() is not None

    @staticmethod
    def _end_expr(db: Session) -> str:
        """
        Devuelve la expresión SQL para 'fin de la reserva' según el esquema:
         - Si existe end_at → usar end_at
         - Si existen fecha_reserva y hora_fin → usar (fecha_reserva::timestamp + hora_fin)
         - Si existen fin (timestamp) → usar fin
        """
        if Service._column_exists(db, "reservas", "end_at"):
            return "r.end_at"
        if Service._column_exists(db, "reservas", "fecha_reserva") and Service._column_exists(db, "reservas", "hora_fin"):
            return "(r.fecha_reserva::timestamp + r.hora_fin)"
        if Service._column_exists(db, "reservas", "fin"):
            return "r.fin"
        # Último fallback: intentar con start/finish genéricos si existieran
        if Service._column_exists(db, "reservas", "fin_reserva"):
            return "r.fin_reserva"
        # Si nada existe, fallamos explícitamente con un mensaje claro
        raise RuntimeError(
            "No encuentro columnas de finalización de reserva (end_at / fecha_reserva+hora_fin / fin). "
            "Ajusta Service._end_expr() a tu esquema real."
        )

    # -------------------- list ---------------------
    @staticmethod
    def list(
        db: Session,
        *,
        id_cancha: Optional[int],
        id_complejo: Optional[int],
        order: str,
        page: int,
        page_size: int,
    ):
        return repo.list_resenas(db, id_cancha, id_complejo, order, page, page_size)

    # -------------------- crear --------------------
    @staticmethod
    def crear(db: Session, *, user_id: int, body: ResenaCreateIn):
        """
        Crea una reseña cuando el usuario tiene al menos UNA reserva CONFIRMADA
        para la cancha indicada o para cualquier cancha del complejo indicado.
        NO exige que la hora de término haya pasado.
        """
        id_cancha, id_complejo = Service._normalize_ids(body.id_cancha, body.id_complejo)

        if not id_cancha and not id_complejo:
            raise ValueError("Debe indicar id_cancha o id_complejo.")
        # (Opcional) Si quieres forzar XOR (solo uno de los dos), descomenta:
        # if id_cancha and id_complejo:
        #     raise ValueError("Indica solo id_cancha o solo id_complejo, no ambos.")

        # Estado confirmado (soporta enum o varchar en es/en)
        estado_confirmado = "r.estado::text IN ('confirmada','confirmed')"

        if id_cancha:
            sql = f"""
            SELECT 1
            FROM reservas r
            WHERE r.id_usuario = :uid
              AND r.id_cancha  = :id_cancha
              AND {estado_confirmado}
            LIMIT 1
            """
            params = {"uid": user_id, "id_cancha": id_cancha}
        else:
            sql = f"""
            SELECT 1
            FROM reservas r
            JOIN canchas c ON c.id_cancha = r.id_cancha
            WHERE r.id_usuario = :uid
              AND c.id_complejo = :id_complejo
              AND {estado_confirmado}
            LIMIT 1
            """
            params = {"uid": user_id, "id_complejo": id_complejo}

        if not db.execute(text(sql), params).first():
            # Mensaje claro si no hay reserva confirmada para ese destino
            raise PermissionError("Sólo puedes reseñar si tienes una reserva confirmada para este destino.")

        # Insertar reseña (repository mapea calificacion -> puntuacion)
        return repo.insert_resena(
            db,
            id_usuario=user_id,
            id_cancha=id_cancha,
            id_complejo=id_complejo,
            calificacion=body.calificacion,
            comentario=body.comentario,
        )
    # -------------------- editar -------------------
    @staticmethod
    def editar(db: Session, *, user_id: int, id_resena: int, body: ResenaUpdateIn):
        res = repo.update_resena(
            db,
            id_resena,
            id_usuario=user_id,  # asegura autoría
            calificacion=body.calificacion,
            comentario=body.comentario,
        )
        if not res:
            raise PermissionError("No puedes editar esta reseña (no es tuya o no existe).")
        return res

    # --------- moderación (admin/dueno/superadmin) ----------
    @staticmethod
    def _puede_moderar_resena(db: Session, *, user_id: int, user_rol: str, id_resena: int) -> bool:
        if user_rol == "superadmin":
            return True
        if user_rol in ("admin", "dueno"):
            target = repo.get_resena_target(db, id_resena)
            if not target:
                return False
            id_complejo_resuelto = target.get("id_complejo_resuelto")
            if id_complejo_resuelto is None:
                return False
            return repo.is_user_admin_of_complejo(db, user_id=user_id, id_complejo=id_complejo_resuelto)
        return False

    @staticmethod
    def borrar(db: Session, *, user_id: int, user_rol: str, id_resena: int):
        # 1) autor puede borrar
        if repo.delete_resena(db, id_resena, id_usuario=user_id, admin=False):
            return {"deleted": True}
        # 2) admin/dueno del complejo o superadmin
        if Service._puede_moderar_resena(db, user_id=user_id, user_rol=user_rol, id_resena=id_resena):
            if repo.delete_resena(db, id_resena, id_usuario=None, admin=True):
                return {"deleted": True}
        raise PermissionError("No tienes permisos para borrar esta reseña.")

    # -------------------- reportar ------------------
    @staticmethod
    def reportar(db: Session, *, id_resena: int, user_id: int, motivo: Optional[str]):
        if not repo.get_resena(db, id_resena):
            raise ValueError("La reseña no existe.")
        return repo.insert_reporte(db, id_resena=id_resena, id_reportante=user_id, motivo=motivo)
