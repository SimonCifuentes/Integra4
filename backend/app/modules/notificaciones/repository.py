# app/modules/notificaciones/repository.py
from __future__ import annotations
from typing import Any, Dict, List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def crear(db: Session, data: Dict[str, Any]) -> Dict[str, Any]:
    sql = text("""
        INSERT INTO notificaciones (
            id_destinatario, titulo, cuerpo
        )
        VALUES (:id_destinatario, :titulo, :cuerpo)
        RETURNING
            id_notificacion,
            id_destinatario,
            titulo,
            cuerpo,
            leida,
            created_at
    """)
    row = db.execute(sql, data).mappings().first()
    db.commit()
    return dict(row)


def listar_por_usuario(
    db: Session,
    id_usuario: int,
    solo_no_leidas: bool = False,
) -> List[Dict[str, Any]]:
    base = """
        SELECT
            id_notificacion,
            id_destinatario,
            titulo,
            cuerpo,
            leida,
            created_at
        FROM notificaciones
        WHERE id_destinatario = :id_usuario
    """
    if solo_no_leidas:
        base += " AND leida = FALSE"
    base += " ORDER BY created_at DESC"

    rows = db.execute(text(base), {"id_usuario": id_usuario}).mappings().all()
    return [dict(r) for r in rows]


def obtener_por_id(
    db: Session,
    id_notificacion: int,
) -> Optional[Dict[str, Any]]:
    sql = text("""
        SELECT
            id_notificacion,
            id_destinatario,
            titulo,
            cuerpo,
            leida,
            created_at
        FROM notificaciones
        WHERE id_notificacion = :id
        LIMIT 1
    """)
    row = db.execute(sql, {"id": id_notificacion}).mappings().first()
    return dict(row) if row else None


def marcar_leida(
    db: Session,
    id_notificacion: int,
    id_usuario: int,
) -> Optional[Dict[str, Any]]:
    sql = text("""
        UPDATE notificaciones
        SET leida = TRUE
        WHERE id_notificacion = :id
          AND id_destinatario = :id_usuario
        RETURNING
            id_notificacion,
            id_destinatario,
            titulo,
            cuerpo,
            leida,
            created_at
    """)
    row = db.execute(sql, {"id": id_notificacion, "id_usuario": id_usuario}).mappings().first()
    if row:
        db.commit()
        return dict(row)
    db.rollback()
    return None


def marcar_todas_leidas(
    db: Session,
    id_usuario: int,
) -> int:
    sql = text("""
        UPDATE notificaciones
        SET leida = TRUE
        WHERE id_destinatario = :id_usuario
          AND leida = FALSE
    """)
    result = db.execute(sql, {"id_usuario": id_usuario})
    db.commit()
    return result.rowcount or 0
