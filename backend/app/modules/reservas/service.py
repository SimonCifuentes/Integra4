# app/modules/reservas/service.py
from __future__ import annotations
from datetime import datetime, date, time, timedelta
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session
from fastapi import HTTPException

from .model import Reserva

# ------------------------
# Config
# ------------------------
CL_TZ = ZoneInfo("America/Santiago")

def _local_combine(fecha: date, hora: time) -> datetime:
    """
    Crea un datetime 'aware' en zona Chile para la fecha+hora dadas.
    No usa conversiones a UTC aquí; Postgres lo almacenará como timestamptz.
    """
    # PEP-495: si tu proyecto necesita manejar horas ambiguas por DST,
    # aquí podrías considerar 'hora = hora.replace(fold=1)' según tu regla.
    return datetime.combine(fecha, hora, tzinfo=CL_TZ)

def _to_out(r: Reserva) -> Dict[str, Any]:
    """
    Serializa una Reserva al contrato de ReservaOut:
    - fecha_reserva (date)
    - hora_inicio/hora_fin "HH:MM" en hora de Chile
    """
    ini_local = r.inicio.astimezone(CL_TZ)
    fin_local = r.fin.astimezone(CL_TZ)
    return {
        "id_reserva": r.id_reserva,
        "id_usuario": r.id_usuario,
        "id_cancha": r.id_cancha,
        "fecha_reserva": ini_local.date(),
        "hora_inicio": ini_local.strftime("%H:%M"),
        "hora_fin": fin_local.strftime("%H:%M"),
        "estado": r.estado,
        "precio_total": float(r.precio_total) if r.precio_total is not None else None,
        "notas": r.notas,
    }

def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    return date.fromisoformat(s)

# ------------------------
# Servicio
# ------------------------
class Service:

    # --------- Crear ----------
    @staticmethod
    def crear(db: Session, data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """
        data viene desde ReservaCreateIn:
        { id_cancha:int, fecha:date, inicio:time, fin:time, notas?:str }
        """
        fecha: date = data["fecha"]
        h_ini: time = data["inicio"]
        h_fin: time = data["fin"]

        if h_fin <= h_ini:
            raise HTTPException(status_code=400, detail="La hora fin debe ser mayor a la hora inicio")

        dt_ini = _local_combine(fecha, h_ini)  # aware (America/Santiago)
        dt_fin = _local_combine(fecha, h_fin)  # aware

        # TODO: valida disponibilidad / choques aquí si corresponde

        r = Reserva(
            id_cancha=data["id_cancha"],
            id_usuario=user_id,
            inicio=dt_ini,
            fin=dt_fin,
            estado="pendiente",
            notas=data.get("notas"),
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        return _to_out(r)

    # --------- Editar ----------
    @staticmethod
    def editar(db: Session, id_reserva: int, patch: Dict[str, Any], user) -> Dict[str, Any]:
        """
        patch: { fecha?:date, inicio?:time, fin?:time, notas?:str }
        """
        r: Optional[Reserva] = db.get(Reserva, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")

        # Permisos (si aplica según tu dominio)… aquí omitido.

        # Construye la nueva pareja aware en Chile:
        ini_local = r.inicio.astimezone(CL_TZ)
        fin_local = r.fin.astimezone(CL_TZ)

        nueva_fecha: date = patch.get("fecha", ini_local.date())
        nuevo_ini: time = patch.get("inicio", ini_local.timetz().replace(tzinfo=None))
        nuevo_fin: time = patch.get("fin",    fin_local.timetz().replace(tzinfo=None))

        if nuevo_fin <= nuevo_ini:
            raise HTTPException(status_code=400, detail="La hora fin debe ser mayor a la hora inicio")

        r.inicio = _local_combine(nueva_fecha, nuevo_ini)  # aware
        r.fin    = _local_combine(nueva_fecha, nuevo_fin)  # aware

        if "notas" in patch:
            r.notas = patch["notas"]

        # TODO: valida choques / reglas si corresponde

        db.commit()
        db.refresh(r)
        return _to_out(r)

    # --------- Detalle ----------
    @staticmethod
    def detalle(db: Session, id_reserva: int, user) -> Dict[str, Any]:
        r: Optional[Reserva] = db.get(Reserva, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        # Permisos según tu dominio… (omitido)
        return _to_out(r)

    # --------- Mis reservas ----------
    @staticmethod
    def mias(db: Session, user_id: int) -> List[Dict[str, Any]]:
        q = select(Reserva).where(Reserva.id_usuario == user_id).order_by(Reserva.inicio.desc())
        rows: List[Reserva] = db.execute(q).scalars().all()
        return [_to_out(r) for r in rows]

    # --------- Listado con filtros ----------
    @staticmethod
    def listar(db: Session, filtros: Dict[str, Any], user) -> List[Dict[str, Any]]:
        q = select(Reserva)

        if filtros.get("estado"):
            q = q.where(Reserva.estado == filtros["estado"])

        if filtros.get("id_cancha"):
            q = q.where(Reserva.id_cancha == filtros["id_cancha"])

        # Rango por fechas (strings 'YYYY-MM-DD' del query), interpretadas en Chile
        d_from = _parse_date(filtros.get("desde"))
        d_to   = _parse_date(filtros.get("hasta"))

        if d_from:
            dt_from = datetime.combine(d_from, time(0, 0), tzinfo=CL_TZ)
            q = q.where(Reserva.inicio >= dt_from)
        if d_to:
            dt_to = datetime.combine(d_to + timedelta(days=1), time(0, 0), tzinfo=CL_TZ)
            q = q.where(Reserva.inicio < dt_to)

        # Si el rol es admin, aquí deberías restringir por sus complejos/canchas (omitido por brevedad)

        q = q.order_by(Reserva.inicio.desc())
        rows: List[Reserva] = db.execute(q).scalars().all()
        return [_to_out(r) for r in rows]

    # --------- Confirmar / Cancelar ----------
    @staticmethod
    def confirmar(db: Session, id_reserva: int, user) -> Dict[str, Any]:
        r: Optional[Reserva] = db.get(Reserva, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        r.estado = "confirmada"
        db.commit(); db.refresh(r)
        return _to_out(r)

    @staticmethod
    def cancelar(db: Session, id_reserva: int, user) -> Dict[str, Any]:
        r: Optional[Reserva] = db.get(Reserva, id_reserva)
        if not r:
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        r.estado = "cancelada"
        db.commit(); db.refresh(r)
        return _to_out(r)

    # --------- Cotizar (placeholder simple) ----------
    @staticmethod
    def cotizar(db: Session, data: Dict[str, Any], user_id: int) -> Dict[str, Any]:
        """
        Cálculo simple de ejemplo:
        - Precio base por hora: 12000 CLP
        - Total proporcional a la duración.
        Reemplaza por tu lógica real (reglas/precios/promos).
        """
        fecha: date = data["fecha"]
        h_ini: time = data["inicio"]
        h_fin: time = data["fin"]

        if h_fin <= h_ini:
            raise HTTPException(status_code=400, detail="La hora fin debe ser mayor a la hora inicio")

        dt_ini = _local_combine(fecha, h_ini)
        dt_fin = _local_combine(fecha, h_fin)
        mins = (dt_fin - dt_ini).total_seconds() / 60.0
        horas = mins / 60.0

        precio_hora = 12000.0
        subtotal = precio_hora * horas
        descuento = 0.0   # aplica tus promos aquí
        total = max(subtotal - descuento, 0.0)

        return {
            "moneda": "CLP",
            "subtotal": round(subtotal, 2),
            "descuento": round(descuento, 2),
            "total": round(total, 2),
            "detalle": f"{horas:.2f} h a {precio_hora:,.0f}/h",
        }
