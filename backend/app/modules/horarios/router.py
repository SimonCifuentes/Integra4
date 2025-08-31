from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/horarios")

@router.get("/ping")
def ping():
    return {"module": "horarios", "status": "ok"}
