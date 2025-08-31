from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/usuarios")

@router.get("/ping")
def ping():
    return {"module": "usuarios", "status": "ok"}
