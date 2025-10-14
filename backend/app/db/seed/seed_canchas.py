# app/db/seed/seed_canchas.py
from __future__ import annotations
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy.engine import Engine

SQL_RELATIVE_PATH = Path(__file__).resolve().parents[1] / "sql" / "03b_canchas.sql"

def run(session_or_engine: Session | Engine) -> dict:
    """Siembra únicamente **canchas** relacionadas a complejos ya existentes.
    Idempotente a nivel práctico si defines una unicidad (id_complejo, nombre) y usas ON CONFLICT DO NOTHING.
    """
    if hasattr(session_or_engine, "get_bind"):
        engine = session_or_engine.get_bind()
    else:
        engine = session_or_engine

    sql_file = SQL_RELATIVE_PATH
    if not sql_file.exists():
        raise FileNotFoundError(f"No se encontró el SQL de seed de canchas en: {sql_file}")

    sql_text = sql_file.read_text(encoding="utf-8")
    with engine.begin() as conn:
        conn.exec_driver_sql(sql_text)

    return {
        "ok": True,
        "file": str(sql_file),
        "message": "Seed de canchas ejecutado correctamente."
    }
