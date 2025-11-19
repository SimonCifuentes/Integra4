from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


# =========================
# Helpers de validación
# =========================

def complejo_existe(db: Session, id_complejo: int) -> bool:
    """
    Verifica si existe un complejo con ese id.
    """
    row = db.execute(
        text("SELECT 1 FROM complejos WHERE id_complejo = :cid"),
        {"cid": id_complejo},
    ).first()
    return bool(row)


def cancha_pertenece_a_complejo(
    db: Session,
    id_cancha: int,
    id_complejo: int,
) -> bool:
    """
    Verifica que la cancha pertenezca al complejo dado.
    """
    row = db.execute(
        text(
            """
            SELECT 1
            FROM canchas
            WHERE id_cancha = :idc
              AND id_complejo = :cid
            """
        ),
        {"idc": id_cancha, "cid": id_complejo},
    ).first()
    return bool(row)


# =========================
# CRUD de horarios_atencion
# =========================

def listar_por_complejo(db: Session, id_complejo: int) -> List[Dict[str, Any]]:
    """
    Lista los horarios del complejo (tanto generales como por cancha).
    """
    rows = db.execute(
        text(
            """
            SELECT
              id_horario,
              id_complejo,
              id_cancha,
              dia::text AS dia_semana,
              to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
              to_char(hora_cierre,   'HH24:MI') AS hora_cierre
            FROM horarios_atencion
            WHERE id_complejo = :cid
            ORDER BY id_cancha NULLS FIRST, id_horario
            """
        ),
        {"cid": id_complejo},
    ).mappings().all()
    return [dict(r) for r in rows]


def obtener_por_id(db: Session, id_horario: int) -> Optional[Dict[str, Any]]:
    """
    Obtiene un horario por su id.
    """
    row = db.execute(
        text(
            """
            SELECT
              id_horario,
              id_complejo,
              id_cancha,
              dia::text AS dia_semana,
              to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
              to_char(hora_cierre,   'HH24:MI') AS hora_cierre
            FROM horarios_atencion
            WHERE id_horario = :hid
            """
        ),
        {"hid": id_horario},
    ).mappings().first()
    return dict(row) if row else None


def crear(
    db: Session,
    *,
    id_complejo: int,
    id_cancha: Optional[int],
    dia_semana: str,
    hora_apertura: str,
    hora_cierre: str,
) -> Dict[str, Any]:
    """
    Crea un nuevo horario y lo devuelve.
    """
    row = db.execute(
        text(
            """
            INSERT INTO horarios_atencion (
              id_complejo,
              id_cancha,
              dia,
              hora_apertura,
              hora_cierre
            )
            VALUES (
              :cid,
              :idc,
              :dia::dia_semana,
              :ha::time,
              :hc::time
            )
            RETURNING
              id_horario,
              id_complejo,
              id_cancha,
              dia::text AS dia_semana,
              to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
              to_char(hora_cierre,   'HH24:MI') AS hora_cierre
            """
        ),
        {
            "cid": id_complejo,
            "idc": id_cancha,
            "dia": dia_semana,
            "ha": hora_apertura,
            "hc": hora_cierre,
        },
    ).mappings().first()
    db.commit()
    return dict(row)


def actualizar(
    db: Session,
    id_horario: int,
    *,
    dia_semana: Optional[str],
    hora_apertura: Optional[str],
    hora_cierre: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    Actualiza parcialmente un horario (día y/u horas).
    """
    campos = []
    params: Dict[str, Any] = {"hid": id_horario}

    if dia_semana is not None:
        campos.append("dia = :dia::dia_semana")
        params["dia"] = dia_semana
    if hora_apertura is not None:
        campos.append("hora_apertura = :ha::time")
        params["ha"] = hora_apertura
    if hora_cierre is not None:
        campos.append("hora_cierre = :hc::time")
        params["hc"] = hora_cierre

    if not campos:
        # No hay cambios; devolvemos el horario actual
        return obtener_por_id(db, id_horario)

    sql = text(
        f"""
        UPDATE horarios_atencion
        SET {", ".join(campos)}
        WHERE id_horario = :hid
        RETURNING
          id_horario,
          id_complejo,
          id_cancha,
          dia::text AS dia_semana,
          to_char(hora_apertura, 'HH24:MI') AS hora_apertura,
          to_char(hora_cierre,   'HH24:MI') AS hora_cierre
        """
    )
    row = db.execute(sql, params).mappings().first()
    db.commit()
    return dict(row) if row else None


def eliminar(db: Session, id_horario: int) -> bool:
    """
    Elimina un horario por id. Devuelve True si borró algo.
    """
    result = db.execute(
        text("DELETE FROM horarios_atencion WHERE id_horario = :hid"),
        {"hid": id_horario},
    )
    db.commit()
    return result.rowcount > 0
