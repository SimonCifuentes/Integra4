from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/promociones")

@router.get("/ping")
def ping():
    return {"module": "promociones", "status": "ok"}
