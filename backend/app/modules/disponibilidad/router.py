from __future__ import annotations
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.shared.deps import get_db
from app.modules.disponibilidad.schemas import DisponibilidadOut, Slot
from app.modules.disponibilidad.service import Service

router = APIRouter(prefix="/disponibilidad", tags=["disponibilidad"])

@router.get("", response_model=DisponibilidadOut)
def disponibilidad(
    id_cancha: int = Query(..., gt=0),
    fecha: date = Query(...),
    slot_min: int = Query(60, ge=15, le=180),
    db: Session = Depends(get_db),
):
    slots = Service.slots(db, id_cancha=id_cancha, fecha=fecha, slot_min=slot_min)
    return DisponibilidadOut(
        id_cancha=id_cancha,
        fecha=fecha,
        slot_min=slot_min,
        slots=[Slot(inicio=a, fin=b) for (a, b) in slots],
    )