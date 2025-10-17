from __future__ import annotations
from typing import Any, Optional, Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import text
import json

def log_accion(
    db: Session,
    *,
    actor_id: Optional[int],
    accion: str,
    objeto_tipo: str,
    id_objeto: int,
    snapshot: Optional[Dict[str, Any]] = None,
    ip: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> None:
    db.execute(
        text("""
        INSERT INTO auditoria (actor_id, accion, objeto_tipo, id_objeto, snapshot, ip, user_agent)
        VALUES (:actor_id, :accion, :objeto_tipo, :id_objeto, CAST(:snapshot AS JSONB), :ip, :user_agent)
        """),
        {
            "actor_id": actor_id,
            "accion": accion,
            "objeto_tipo": "reserva" if objeto_tipo == "reserva" else objeto_tipo,
            "id_objeto": id_objeto,
            "snapshot": json.dumps(snapshot) if snapshot is not None else None,
            "ip": ip,
            "user_agent": user_agent,
        },
    )
    db.commit()

def logs_de_reserva(db: Session, *, id_reserva: int, limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    rows = db.execute(
        text("""
        SELECT id_auditoria, actor_id, accion, snapshot, ip, user_agent, created_at
        FROM auditoria
        WHERE objeto_tipo = 'reserva' AND id_objeto = :rid
        ORDER BY created_at DESC
        LIMIT :limit OFFSET :offset
        """),
        {"rid": id_reserva, "limit": limit, "offset": offset}
    ).mappings().all()
    return [dict(r) for r in rows]
