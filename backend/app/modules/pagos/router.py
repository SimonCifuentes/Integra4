from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter(prefix="/pagos")

@router.get("/ping")
def ping():
    return {"module": "pagos", "status": "ok"}
