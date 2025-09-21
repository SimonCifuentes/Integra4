# app/db/base.py
from app.db.base_class import Base  # Base vive aquí, pero se define en base_class

# IMPORTANTE: importa aquí todos los modelos para que el metadata los conozca
from app.modules.auth.model import Usuario  # noqa: F401

# En el futuro: añade aquí otros modelos:
# from app.modules.usuarios.model import ...
# from app.modules.complejos.model import ...

from app.modules.reservas.model import Reserva  # noqa: F401

