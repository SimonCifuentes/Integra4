# app/modules/reservas/service.py
from typing import Any, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.modules.reservas import repository as repo
from app.modules.auth.model import Usuario

def _solo_dueno_admin(user: Usuario):
    if user.rol not in ("dueno", "admin", "superadmin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

class Service:

    @staticmethod
    def mias(db: Session, user_id: int):
        return repo.mias(db, user_id)

    @staticmethod
    def listar(db, filtros: dict, user):
        if user.rol == "superadmin":
            return repo.listar_superadmin(db, filtros)     # ← sin restricciones
        if user.rol == "admin":
            return repo.listar_admin(db, admin_id=user.id_usuario, filtros=filtros)
        raise HTTPException(status_code=403, detail="No autorizado")

    @staticmethod
    def detalle(db, id_reserva: int, user):
        r = repo.detalle(db, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        if user.rol == "superadmin":
            return r                                       # ← sin restricciones
        if user.rol == "admin":
            if not repo.pertenece_a_admin(db, id_reserva, user.id_usuario):
                raise HTTPException(status_code=403, detail="No autorizado")
            return r
        if r["id_usuario"] != user.id_usuario:
            raise HTTPException(status_code=403, detail="No autorizado")
        return r
    
    @staticmethod
    def cotizar(db: Session, payload: Dict[str, Any], user_id: int):
        # Podrías validar horarios de atención o bloqueos aquí (versión 1: rápida)
        return repo.cotizar(db, payload)

    @staticmethod
    def crear(db: Session, payload: Dict[str, Any], user_id: int):
        # Calcula precio si no viene (para uniformidad en DB)
        if "precio_total" not in payload or payload["precio_total"] is None:
            q = repo.cotizar(db, payload)
            payload = dict(payload)
            payload["precio_total"] = q["total"]
        try:
            return repo.crear(db, user_id, payload)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

    @staticmethod
    def editar(db: Session, id_reserva: int, payload: Dict[str, Any], user: Usuario):
        r = repo.detalle(db, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        # Solo el dueño de la reserva o admin/dueno
        if user.rol not in ("dueno","admin","superadmin") and r["id_usuario"] != user.id_usuario:
            raise HTTPException(status_code=403, detail="No autorizado")
        try:
            return repo.actualizar(db, id_reserva, payload)
        except ValueError as e:
            raise HTTPException(status_code=409, detail=str(e))

    @staticmethod
    def confirmar(db, id_reserva: int, user):
        if user.rol == "superadmin":
            return repo.cambio_estado(db, id_reserva, "confirmada")  # ← sin restricciones
        if user.rol == "admin":
            if not repo.pertenece_a_admin(db, id_reserva, user.id_usuario):
                raise HTTPException(status_code=403, detail="No autorizado")
            return repo.cambio_estado(db, id_reserva, "confirmada")
        raise HTTPException(status_code=403, detail="No autorizado")

    @staticmethod
    def cancelar(db, id_reserva: int, user):
        if user.rol == "superadmin":
            r2 = repo.cambio_estado(db, id_reserva, "cancelada")     # ← sin restricciones
            if not r2:
                raise HTTPException(status_code=404, detail="Reserva no encontrada")
            return r2
        r = repo.detalle(db, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        if user.rol == "admin":
            if not repo.pertenece_a_admin(db, id_reserva, user.id_usuario):
                raise HTTPException(status_code=403, detail="No autorizado")
            return repo.cambio_estado(db, id_reserva, "cancelada")
        if r["id_usuario"] != user.id_usuario:
            raise HTTPException(status_code=403, detail="No autorizado")
        return repo.cambio_estado(db, id_reserva, "cancelada")