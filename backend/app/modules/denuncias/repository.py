# app/modules/denuncias/repository.py
from __future__ import annotations

from typing import Any, Optional, Sequence

from sqlalchemy import text
from sqlalchemy.orm import Session

from .schemas import DenunciaCreateIn, DenunciaAdminReplyIn, EstadoDenuncia

# -------------------------------------------------------------------
# SELECT base: aliasamos columnas para calzar con los Schemas Pydantic
# -------------------------------------------------------------------

_DEF_SELECT = """
SELECT
  d.id_denuncia,
  d.id_reportante,
  d.tipo_objeto,
  d.id_objeto,
  d.motivo      AS titulo,
  d.comentario  AS descripcion,
  d.estado::text AS estado,
  d.tipo_mensaje,
  d.categoria,
  d.respuesta_admin,
  d.id_admin_resp,
  d.responded_at,
  d.created_at,
  d.updated_at
FROM denuncias d
"""


def _row_to_dict(row) -> dict[str, Any]:
    """Convierte un Row de SQLAlchemy en dict plano."""
    return dict(row._mapping)


# -------------------------------------------------------------------
# CREAR DENUNCIA (USUARIO)
# -------------------------------------------------------------------


def crear_denuncia(
    db: Session,
    id_reportante: int,
    data: DenunciaCreateIn,
) -> dict[str, Any]:
    """
    Inserta una nueva denuncia / queja / aporte en la tabla `denuncias`.

    No seteamos `estado` aquí para usar el DEFAULT del ENUM (por ejemplo: 'abierta').
    """
    sql = """
    INSERT INTO denuncias (
        id_reportante,
        tipo_objeto,
        id_objeto,
        motivo,
        comentario,
        tipo_mensaje,
        categoria
    )
    VALUES (
        :id_reportante,
        :tipo_objeto,
        :id_objeto,
        :motivo,
        :comentario,
        :tipo_mensaje,
        :categoria
    )
    RETURNING
        id_denuncia,
        id_reportante,
        tipo_objeto,
        id_objeto,
        motivo      AS titulo,
        comentario  AS descripcion,
        estado::text AS estado,
        tipo_mensaje,
        categoria,
        respuesta_admin,
        id_admin_resp,
        responded_at,
        created_at,
        updated_at;
    """

    params = {
        "id_reportante": id_reportante,
        # Si el cliente no manda tipo_objeto, lo igualamos a la categoría o a 'app'
        "tipo_objeto": data.tipo_objeto or data.categoria or "app",
        "id_objeto": data.id_objeto,
        "motivo": data.titulo,
        "comentario": data.descripcion,
        "tipo_mensaje": data.tipo_mensaje,
        "categoria": data.categoria,
    }

    row = db.execute(text(sql), params).one()
    return _row_to_dict(row)


# -------------------------------------------------------------------
# LECTURAS
# -------------------------------------------------------------------


def obtener_denuncia(
    db: Session,
    id_denuncia: int,
) -> Optional[dict[str, Any]]:
    """
    Obtiene una denuncia por ID (para detalle en admin o usuario).
    """
    row = db.execute(
        text(_DEF_SELECT + " WHERE d.id_denuncia = :id_denuncia"),
        {"id_denuncia": id_denuncia},
    ).first()

    return _row_to_dict(row) if row else None


def listar_denuncias_usuario(
    db: Session,
    id_reportante: int,
) -> list[dict[str, Any]]:
    """
    Lista todas las denuncias creadas por un usuario concreto.
    """
    rows: Sequence = db.execute(
        text(
            _DEF_SELECT
            + " WHERE d.id_reportante = :id_reportante "
            + " ORDER BY d.created_at DESC"
        ),
        {"id_reportante": id_reportante},
    ).all()

    return [_row_to_dict(r) for r in rows]

def listar_denuncias_admin(
    db: Session,
    estado: Optional[EstadoDenuncia] = None,
    categoria: Optional[str] = None,
    tipo_mensaje: Optional[str] = None,
) -> list[dict[str, Any]]:
    where = []
    params: dict[str, Any] = {}

    # ❌ ESTO ESTÁ ROMPIENDO
    # if estado:
    #     where.append("d.estado = :estado::estado_denuncia")
    #     params["estado"] = estado

    # ✅ DEJA ESTO ASÍ
    if estado:
        # Comparamos directamente contra el enum, Postgres castea la string solito
        where.append("d.estado = :estado")
        params["estado"] = estado

    if categoria:
        where.append("d.categoria = :categoria")
        params["categoria"] = categoria

    if tipo_mensaje:
        where.append("d.tipo_mensaje = :tipo_mensaje")
        params["tipo_mensaje"] = tipo_mensaje

    sql = _DEF_SELECT
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY d.created_at DESC"

    rows: Sequence = db.execute(text(sql), params).all()
    return [_row_to_dict(r) for r in rows]


# -------------------------------------------------------------------
# RESPUESTA DEL SUPER ADMIN
# -------------------------------------------------------------------

def responder_denuncia(
    db: Session,
    id_denuncia: int,
    id_admin: int,
    data: DenunciaAdminReplyIn,
) -> Optional[dict[str, Any]]:
    sql = """
    UPDATE denuncias
    SET
        respuesta_admin = :respuesta,
        id_admin_resp   = :id_admin_resp,
        responded_at    = now(),
        -- ❌ ANTES:
        -- estado          = :estado::estado_denuncia,
        -- ✅ AHORA:
        estado          = :estado,
        updated_at      = now()
    WHERE id_denuncia = :id_denuncia
    RETURNING
        id_denuncia,
        id_reportante,
        tipo_objeto,
        id_objeto,
        motivo      AS titulo,
        comentario  AS descripcion,
        estado::text AS estado,
        tipo_mensaje,
        categoria,
        respuesta_admin,
        id_admin_resp,
        responded_at,
        created_at,
        updated_at;
    """

    params = {
        "id_denuncia": id_denuncia,
        "id_admin_resp": id_admin,
        "respuesta": data.respuesta,
        "estado": data.estado,  # 👈 IMPORTANTE: que esté este parámetro
    }

    row = db.execute(text(sql), params).first()
    return _row_to_dict(row) if row else None
