from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/denuncias")

@router.get("/ping")
def ping():
    return {"module": "denuncias", "status": "ok"}
