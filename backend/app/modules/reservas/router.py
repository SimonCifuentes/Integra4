from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/reservas")

@router.get("/ping")
def ping():
    return {"module": "reservas", "status": "ok"}
