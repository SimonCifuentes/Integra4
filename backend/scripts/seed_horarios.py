# scripts/seed_horarios.py
"""
Crea horarios_atencion base (08:00 -> 23:00 todos los días)
para cada complejo que aún NO tenga horarios generales cargados.

- id_cancha = NULL  => horario general del complejo
- dia = 'lunes'..'domingo' (enum dia_semana)
- Seguro de re-ejecución: NO duplica si ya existe (id_complejo,NULL,dia)

Uso:
  1. Activar el venv:
        .venv\Scripts\activate    # Windows
     o  source .venv/bin/activate # Linux/Mac
  2. Ejecutar:
        python scripts/seed_horarios.py
"""

from __future__ import annotations
import sys
from pathlib import Path
from typing import List, Dict

from sqlalchemy import create_engine, text

try:
    from dotenv import dotenv_values
except ModuleNotFoundError:
    print("Falta python-dotenv. Instala con: pip install python-dotenv")
    sys.exit(1)

DIAS = [
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
]

def find_env_file() -> Path | None:
    """
    Busca un .env empezando en /backend (padre de scripts/) y subiendo.
    Igual lógica que promote_user.py.
    """
    start = Path(__file__).resolve().parent.parent  # carpeta backend
    for p in [start, start.parent, start.parent.parent]:
        env = p / ".env"
        if env.exists():
            return env
    return None

def build_db_url(vals: Dict[str, str]) -> str | None:
    """
    Prioriza DATABASE_URL. Si no está, construye con DB_HOST/DB_PORT/etc.
    Compatible con .env.example del proyecto.
    """
    url = vals.get("DATABASE_URL") or vals.get("database_url")
    if url:
        return url.strip()

    host = vals.get("DB_HOST")
    port = vals.get("DB_PORT")
    user = vals.get("DB_USER")
    pwd  = vals.get("DB_PASSWORD")
    name = vals.get("DB_NAME")
    if all([host, port, user, pwd, name]):
        return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{name}"
    return None

def ensure_engine():
    env_path = find_env_file()
    if not env_path:
        print("No se encontró .env. Pon tu .env en backend/ o en la carpeta superior.")
        sys.exit(2)

    vals = dotenv_values(env_path)
    db_url = build_db_url(vals)
    if not db_url:
        print("No se pudo construir DATABASE_URL.")
        print("Define DATABASE_URL en .env o DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.")
        sys.exit(3)

    # Nota: si usas psycopg3 en lugar de psycopg2, ajusta el driver.
    engine = create_engine(db_url, pool_pre_ping=True, future=True)
    return engine

def seed_horarios(engine):
    with engine.begin() as conn:
        complejos = conn.execute(
            text("""
                SELECT id_complejo, nombre
                FROM complejos
                WHERE deleted_at IS NULL OR deleted_at IS NULL
                -- si tu tabla no tiene deleted_at aún, puedes borrar la línea WHERE
            """)
        ).mappings().all()

        for comp in complejos:
            cid = comp["id_complejo"]
            nombre = comp["nombre"]

            for dia in DIAS:
                # ¿Ya tiene horario general este día?
                existe = conn.execute(
                    text("""
                        SELECT 1
                        FROM horarios_atencion
                        WHERE id_complejo = :cid
                          AND id_cancha IS NULL
                          AND dia = :dia::dia_semana
                        LIMIT 1
                    """),
                    {"cid": cid, "dia": dia},
                ).first()

                if existe:
                    # Ya había un registro => no duplicar
                    continue

                # Crear horario general 08:00-23:00
                conn.execute(
                    text("""
                        INSERT INTO horarios_atencion (
                            id_complejo,
                            id_cancha,
                            dia,
                            hora_apertura,
                            hora_cierre
                        )
                        VALUES (
                            :cid,
                            NULL,
                            :dia::dia_semana,
                            TIME '08:00',
                            TIME '23:00'
                        )
                    """),
                    {"cid": cid, "dia": dia},
                )
                print(f"[OK] {nombre} -> {dia} 08:00-23:00 insertado")

    print("Listo: horarios_atencion base creados/asegurados.")

def main():
    engine = ensure_engine()
    seed_horarios(engine)

if __name__ == "__main__":
    main()
