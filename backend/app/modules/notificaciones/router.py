from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/notificaciones")

@router.get("/ping")
def ping():
    return {"module": "notificaciones", "status": "ok"}
