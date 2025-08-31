from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/favoritos")

@router.get("/ping")
def ping():
    return {"module": "favoritos", "status": "ok"}
