# scripts/promote_user.py
from __future__ import annotations
import sys
from typing import Literal
from pathlib import Path

from sqlalchemy import create_engine, text

try:
    from dotenv import dotenv_values
except ModuleNotFoundError:
    print("Falta python-dotenv. Instala con: pip install python-dotenv")
    sys.exit(1)

VALID: set[Literal["usuario","dueno","admin","superadmin"]] = {
    "usuario","dueno","admin","superadmin"
}

def find_env_file() -> Path | None:
    """
    Busca .env desde el directorio del proyecto (carpeta backend) hacia arriba.
    """
    # carpeta backend = padre de scripts/
    start = Path(__file__).resolve().parent.parent
    for p in [start, start.parent, start.parent.parent]:
        env = p / ".env"
        if env.exists():
            return env
    return None

def build_db_url(vals: dict) -> str | None:
    """
    Prioriza DATABASE_URL. Si no existe, intenta construirla con DB_*.
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

def main() -> None:
    if len(sys.argv) != 3:
        print("Uso: python scripts/promote_user.py <email> <rol>")
        print("Ej:  python scripts/promote_user.py root@demo.cl superadmin")
        sys.exit(1)

    email = sys.argv[1].strip().lower()
    rol   = sys.argv[2].strip().lower()
    if rol not in VALID:
        print(f"Rol inválido: {rol}. Válidos: {', '.join(VALID)}")
        sys.exit(2)

    env_path = find_env_file()
    if not env_path:
        print("No se encontró .env. Coloca el archivo en la carpeta backend o superior.")
        sys.exit(3)

    vals = dotenv_values(env_path)
    db_url = build_db_url(vals)
    if not db_url:
        print("No se pudo obtener la cadena de conexión.")
        print("- Define DATABASE_URL en .env, o")
        print("- Define DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME")
        sys.exit(4)

    # Nota: si tu URL usa psycopg3 (postgresql+psycopg://), instala 'psycopg[binary]'.
    engine = create_engine(db_url, pool_pre_ping=True, future=True)
    with engine.begin() as conn:
        r = conn.execute(
            text("SELECT id_usuario, email, rol FROM usuarios WHERE email=:email"),
            {"email": email}
        ).fetchone()
        if not r:
            print("Usuario no encontrado")
            sys.exit(5)

        conn.execute(
            text("UPDATE usuarios SET rol=:rol WHERE email=:email"),
            {"rol": rol, "email": email}
        )
        r2 = conn.execute(
            text("SELECT id_usuario, email, rol FROM usuarios WHERE email=:email"),
            {"email": email}
        ).fetchone()

    print(f"OK -> {r2.id_usuario} {r2.email} ahora es {r2.rol}")

if __name__ == "__main__":
    main()
