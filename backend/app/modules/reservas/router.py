from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.reservas.schemas import ReservaCreateIn, ReservaOut
from app.modules.reservas.service import Service

router = APIRouter(prefix="/reservas", tags=["reservas"])

@router.get("/mias", response_model=list[ReservaOut])
def mis_reservas(
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.mias(db, user_id=user.id_usuario)

@router.post("", response_model=ReservaOut, status_code=201)
def crear_reserva(
    body: ReservaCreateIn,
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    try:
        return Service.crear(db, user_id=user.id_usuario, data=body)
    except RuntimeError as e:
        if str(e) == "OVERLAP":
            raise HTTPException(status_code=409, detail="La cancha ya está reservada en ese horario")
        raise

@router.post("/{id_reserva}/cancelar", response_model=ReservaOut)
def cancelar_reserva(
    id_reserva: int,
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    r = Service.cancelar(db, user_id=user.id_usuario, reserva_id=id_reserva)
    if not r:
        raise HTTPException(status_code=404, detail="Reserva no encontrada o ya cancelada")
    return r