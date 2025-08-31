from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/disponibilidad")

@router.get("/ping")
def ping():
    return {"module": "disponibilidad", "status": "ok"}
