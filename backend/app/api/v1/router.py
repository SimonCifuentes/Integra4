# app/api/v1/router.py
from fastapi import APIRouter

from app.modules.auth.router import router as auth
from app.modules.usuarios.router import router as usuarios
from app.modules.complejos.router import router as complejos
from app.modules.canchas.router import router as canchas
from app.modules.disponibilidad.router import router as disponibilidad
from app.modules.reservas.router import router as reservas
from app.modules.pagos.router import router as pagos
from app.modules.promociones.router import router as promociones
from app.modules.notificaciones.router import router as notificaciones
from app.modules.resenas.router import router as resenas
from app.modules.grupos.router import router as grupos
from app.modules.favoritos.router import router as favoritos
from app.modules.denuncias.router import router as denuncias
from app.modules.admin.router import router as admin
from app.modules.superadmin.router import router as superadmin

api_router = APIRouter()

# Si cada router YA tiene prefix, no pongas prefix aquí:
api_router.include_router(auth)
api_router.include_router(usuarios)
api_router.include_router(complejos)
api_router.include_router(canchas)
api_router.include_router(disponibilidad)
api_router.include_router(reservas)
api_router.include_router(pagos)
api_router.include_router(promociones)
api_router.include_router(notificaciones)
api_router.include_router(resenas)
api_router.include_router(grupos)
api_router.include_router(favoritos)
api_router.include_router(denuncias)

# Para estos dos, si dentro NO tienen prefix, mantenlos con prefix aquí:
api_router.include_router(admin, prefix="/admin")
api_router.include_router(superadmin, prefix="/superadmin")

# Meta endpoints útiles
@api_router.get("/healthz", tags=["_meta"])
def healthz():
    return {"status": "ok"}

@api_router.get("/version", tags=["_meta"])
def version():
    return {"name": "SportHubTemuco", "api": "v1"}
