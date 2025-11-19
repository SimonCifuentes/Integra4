# app/modules/horarios/service.py
from __future__ import annotations

from typing import Dict, Any, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from .repository import (
    create as repo_create,
    patch as repo_patch,
    delete as repo_delete,
    list_by_cancha as repo_list_by_cancha,
)


def _validar_rango_horas(data: Dict[str, Any]) -> None:
    """
    Valida que hora_apertura < hora_cierre cuando ambas están presentes.
    """
    h_ini = data.get("hora_apertura")
    h_fin = data.get("hora_cierre")

    if h_ini is not None and h_fin is not None and h_ini >= h_fin:
        raise HTTPException(
            status_code=422,
            detail="hora_apertura debe ser menor que hora_cierre",
        )


def crear(db: Session, body: Dict[str, Any]) -> int:
    """
    Crea un horario de atención validando el rango de horas.
    """
    _validar_rango_horas(body)
    # repo_create espera 'dia', que coincide con la columna en la BD
    return repo_create(db, body)


def actualizar_parcial(db: Session, id_horario: int, fields: Dict[str, Any]) -> None:
    """
    Actualiza parcialmente un horario.

    - Si vienen ambas horas, valida que apertura < cierre.
    - NO se hace ningún mapeo raro, se usa 'dia' tal cual,
      porque la columna en la BD también se llama 'dia'.
    """
    if not fields:
        return

    _validar_rango_horas(fields)

    if not repo_patch(db, id_horario, fields):
        raise HTTPException(status_code=404, detail="Horario no encontrado")


def eliminar(db: Session, id_horario: int) -> None:
    """
    Elimina un horario por ID o lanza 404 si no existe.
    """
    if not repo_delete(db, id_horario):
        raise HTTPException(status_code=404, detail="Horario no encontrado")


def listar_por_cancha(db: Session, id_cancha: int) -> List[Dict[str, Any]]:
    """
    Lista los horarios asociados a una cancha.
    """
    return repo_list_by_cancha(db, id_cancha)
