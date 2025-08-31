from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/canchas")

@router.get("/ping")
def ping():
    return {"module": "canchas", "status": "ok"}
