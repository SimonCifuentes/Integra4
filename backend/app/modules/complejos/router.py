from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/complejos")

@router.get("/ping")
def ping():
    return {"module": "complejos", "status": "ok"}
