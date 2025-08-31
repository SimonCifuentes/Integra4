from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter()

@router.post("/parametros", dependencies=[Depends(require_roles("superadmin"))])
def actualizar_parametros():
    return {"ok": True}
