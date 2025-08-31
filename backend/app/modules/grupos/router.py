from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/grupos")

@router.get("/ping")
def ping():
    return {"module": "grupos", "status": "ok"}
