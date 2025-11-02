# app/modules/admin/repository.py
from typing import Dict, List, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

def search_admins(db: Session, q: str | None, page: int, page_size: int) -> Tuple[List[Dict], int]:
    params = {"limit": page_size, "offset": (page - 1) * page_size}
    filtro_q = ""
    if q:
        filtro_q = "AND (u.nombre ILIKE :q OR u.apellido ILIKE :q OR u.email ILIKE :q)"
        params["q"] = f"%{q}%"

    sql_items = f"""
        SELECT u.id_usuario, u.rol, u.email, u.nombre, u.apellido, u.telefono
        FROM usuarios u
        WHERE u.rol::text IN ('admin','dueno')
          {filtro_q}
        ORDER BY u.nombre NULLS LAST, u.apellido NULLS LAST, u.email
        LIMIT :limit OFFSET :offset
    """
    sql_total = f"""
        SELECT COUNT(*) AS total
        FROM usuarios u
        WHERE u.rol::text IN ('admin','dueno')
          {filtro_q}
    """

    rows = db.execute(text(sql_items), params).mappings().all()
    total = db.execute(text(sql_total), params).scalar_one()
    return [dict(r) for r in rows], int(total)
