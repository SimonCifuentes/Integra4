from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter()

@router.get("/usuarios", dependencies=[Depends(require_roles("admin","superadmin"))])
def listar_usuarios():
    return {"ok": True}

@router.post("/moderacion/resenas/{id_resena}/ocultar", dependencies=[Depends(require_roles("admin","superadmin"))])
def moderar_resena(id_resena: int):
    return {"ok": True, "id_resena": id_resena}
