from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from app.api.deps import get_db  # ajusta a tu función de dependencia real
# Si usas auth, agrega: from app.api.auth_deps import jwt_requerido

from .schemas import CotizacionCreateIn, CotizacionUpdateIn, CotizacionOut
from . import service

router = APIRouter(prefix="/cotizaciones", tags=["Cotizaciones"])

@router.post("", response_model=CotizacionOut, status_code=status.HTTP_201_CREATED)
def create_cotizacion(body: CotizacionCreateIn, db: Session = Depends(get_db)):  # , user=Depends(jwt_requerido)
    cot = service.create(db, body)
    return cot

@router.get("", response_model=List[CotizacionOut])
def list_cotizaciones(q: Optional[str] = None, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    return service.list_(db, q=q, limit=limit, offset=offset)

@router.get("/{cot_id}", response_model=CotizacionOut)
def get_cotizacion(cot_id: int, db: Session = Depends(get_db)):
    cot = service.get(db, cot_id)
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    return cot

@router.patch("/{cot_id}", response_model=CotizacionOut)
def update_cotizacion(cot_id: int, body: CotizacionUpdateIn, db: Session = Depends(get_db)):
    cot = service.get(db, cot_id)
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    cot = service.update(db, cot, body)
    return cot

@router.delete("/{cot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cotizacion(cot_id: int, db: Session = Depends(get_db)):
    cot = service.get(db, cot_id)
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")
    from . import repository as repo
    repo.delete_cotizacion(db, cot)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

# --------- Exportaciones sencillas ---------
@router.get("/{cot_id}/export.csv")
def export_csv(cot_id: int, db: Session = Depends(get_db)):
    cot = service.get(db, cot_id)
    if not cot:
        raise HTTPException(status_code=404, detail="Cotización no encontrada")

    import io, csv
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["Paquete","Rol","Horas","TarifaHora","Subtotal","Descripcion"])
    for it in cot.items:
        w.writerow([it.paquete, it.rol, it.horas, it.tarifa_hora, it.subtotal, it.descripcion or ""])
    csv_bytes = buf.getvalue().encode("utf-8")
    from fastapi.responses import StreamingResponse
    return StreamingResponse(iter([csv_bytes]), media_type="text/csv",
                             headers={"Content-Disposition": f'attachment; filename="cotizacion_{cot.id}.csv"'})
