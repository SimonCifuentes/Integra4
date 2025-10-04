from fastapi import APIRouter, Depends
from app.shared.deps import require_roles

router = APIRouter()

@router.post("/parametros", dependencies=[Depends(require_roles("superadmin"))])
def actualizar_parametros():
    return {"ok": True}

from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.seed.seed_initial import run as run_seed

@router.post("/seed", dependencies=[Depends(require_roles("superadmin"))])
def run_seed_endpoint(db: Session = Depends(get_db)):
    """Ejecuta el seed SQL completo (incluye **/complejos** de ejemplo).
    Requiere rol **superadmin**.
    """
    result = run_seed(db)
    return result
