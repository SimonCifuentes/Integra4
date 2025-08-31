from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/resenas")

@router.get("/ping")
def ping():
    return {"module": "resenas", "status": "ok"}
