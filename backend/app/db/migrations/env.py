from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys, os

# Agregamos el backend al sys.path
sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))

from app.db.base import Base
from app.core.config import settings  # <-- importa settings que lee .env automáticamente

# Configuración de Alembic
config = context.config

# Si no hay URL en alembic.ini, usamos la del settings
# Forzar siempre la URL desde settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


# Configurar logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    """Correr migraciones en modo offline."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Correr migraciones en modo online."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
