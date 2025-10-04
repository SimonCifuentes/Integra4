# app/db/seed/seed_initial.py
from __future__ import annotations
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

SQL_RELATIVE_PATH = Path(__file__).resolve().parents[1] / "sql" / "03_datos_iniciales.sql"

def run(session_or_engine: Session | Engine) -> dict:
    """Ejecuta el seed SQL (03_datos_iniciales.sql).
    Abarca comunas, usuarios de prueba, servicios, **complejos**, canchas, reservas, etc.
    Deja los /complejos listables con GET /api/v1/complejos.
    Devuelve un resumen mínimo.
    """
    # Permitir Session o Engine
    if hasattr(session_or_engine, "get_bind"):
        engine = session_or_engine.get_bind()
    else:
        engine = session_or_engine

    sql_file = SQL_RELATIVE_PATH
    if not sql_file.exists():
        raise FileNotFoundError(f"No se encontró el SQL de seed en: {sql_file}")

    sql_text = sql_file.read_text(encoding="utf-8")

    # Ejecutar en una transacción
    with engine.begin() as conn:
        # Usamos exec_driver_sql para soportar múltiples sentencias separadas por ';'
        conn.exec_driver_sql(sql_text)

    return {
        "ok": True,
        "file": str(sql_file),
        "message": "Seed ejecutado correctamente (incluye complejos)."
    }
