from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/pricing")

@router.get("/ping")
def ping():
    return {"module": "pricing", "status": "ok"}
