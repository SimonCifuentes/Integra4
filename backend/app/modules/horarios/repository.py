# app/modules/horarios/repository.py
from __future__ import annotations

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session


def create(db: Session, data: dict) -> int:
    """
    Inserta un horario en la tabla horarios_atencion.

    La columna en la BD se llama 'dia', NO 'dia_semana'.
    """
    stmt = text(
        """
        INSERT INTO horarios_atencion (
            id_complejo,
            id_cancha,
            dia,
            hora_apertura,
            hora_cierre
        )
        VALUES (:id_complejo, :id_cancha, :dia, :hora_apertura, :hora_cierre)
        RETURNING id_horario
        """
    )
    return db.execute(stmt, data).scalar_one()


def patch(db: Session, id_horario: int, fields: dict) -> bool:
    """
    Actualiza columnas de un horario por id_horario.

    IMPORTANTE: las keys de 'fields' deben coincidir con
    los nombres de columnas reales de la tabla:
    - id_complejo
    - id_cancha
    - dia
    - hora_apertura
    - hora_cierre
    """
    if not fields:
        return False

    parts: list[str] = []
    params: dict[str, Any] = {"id": id_horario}

    for col, value in fields.items():
        parts.append(f"{col} = :{col}")
        params[col] = value

    sql = f"""
        UPDATE horarios_atencion
        SET {", ".join(parts)}
        WHERE id_horario = :id
        RETURNING id_horario
    """

    result = db.execute(text(sql), params).one_or_none()
    return result is not None


def delete(db: Session, id_horario: int) -> bool:
    """
    Elimina un horario por ID. Retorna True si existía.
    """
    stmt = text(
        """
        DELETE FROM horarios_atencion
        WHERE id_horario = :id
        RETURNING id_horario
        """
    )
    result = db.execute(stmt, {"id": id_horario}).one_or_none()
    return result is not None


def list_by_cancha(db: Session, id_cancha: int) -> list[dict[str, Any]]:
    """
    Devuelve todos los horarios asociados a una cancha específica.

    Aquí la columna también es 'dia', así que solo la aliasamos tal cual.
    """
    stmt = text(
        """
        SELECT
            id_horario,
            id_complejo,
            id_cancha,
            dia,
            hora_apertura,
            hora_cierre
        FROM horarios_atencion
        WHERE id_cancha = :id_cancha
        ORDER BY dia, hora_apertura
        """
    )

    rows = db.execute(stmt, {"id_cancha": id_cancha}).mappings().all()
    return [dict(row) for row in rows]
