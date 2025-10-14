from typing import List
from sqlalchemy.orm import Session
from .model import Cotizacion
from .schemas import CotizacionCreateIn, CotizacionUpdateIn
from . import repository as repo

# Negocio adicional (validaciones, reglas)
VALID_ROLES = {
    "Líder Técnico / Arquitecto": 28000.0,
    "Backend Senior (FastAPI)": 24000.0,
    "Frontend Mobile (Expo/React Native)": 23000.0,
    "DevOps / CI-CD": 24000.0,
    "QA / Tester": 17000.0,
    "PM / Coordinación": 20000.0,
}

def ensure_rates(items):
    """Si algún item trae tarifa_hora = 0, le asignamos la tarifa por defecto del rol (si existe)."""
    from pydantic import BaseModel
    class _I(BaseModel):
        paquete: str
        rol: str
        horas: float
        tarifa_hora: float
        descripcion: str | None = None
    fixed=[]
    for raw in items:
        it = _I(**raw)
        tarifa = it.tarifa_hora if it.tarifa_hora > 0 else VALID_ROLES.get(it.rol, 0.0)
        fixed.append({**it.model_dump(), "tarifa_hora": tarifa})
    return fixed

def create(db: Session, data: CotizacionCreateIn) -> Cotizacion:
    data.items = [type(data.items[0])(**it) if isinstance(it, dict) else it for it in ensure_rates([i.model_dump() for i in data.items])]
    return repo.create_cotizacion(db, data)

def list_(db: Session, q: str | None, limit: int, offset: int) -> List[Cotizacion]:
    return repo.list_cotizaciones(db, q=q, limit=limit, offset=offset)

def get(db: Session, cot_id: int) -> Cotizacion | None:
    return repo.get_cotizacion(db, cot_id)

def update(db: Session, cot: Cotizacion, data: CotizacionUpdateIn) -> Cotizacion:
    if data.items is not None:
        data.items = [type(data.items[0])(**it) if isinstance(it, dict) else it for it in ensure_rates([i.model_dump() for i in data.items])]
    return repo.update_cotizacion(db, cot, data)
