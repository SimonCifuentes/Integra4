from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/bloqueos")

@router.get("/ping")
def ping():
    return {"module": "bloqueos", "status": "ok"}
