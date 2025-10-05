from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.reservas.schemas import ReservaCreateIn, ReservaOut
# Si agregaste el esquema opcional de motivo:
# from app.modules.reservas.schemas import CancelReservaIn
from app.modules.reservas.service import Service

router = APIRouter(prefix="/reservas", tags=["reservas"])

@router.get("/mias", response_model=list[ReservaOut])
def mis_reservas(
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.mias(db, user_id=user.id_usuario)

@router.post("", response_model=ReservaOut, status_code=status.HTTP_201_CREATED)
def crear_reserva(
    body: ReservaCreateIn,
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    try:
        return Service.crear(db, user_id=user.id_usuario, data=body)
    except RuntimeError as e:
        if str(e) == "OVERLAP":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="La cancha ya está reservada en ese horario"
            )
        raise

# === Cancelar como usuario (solo si NO ha comenzado) ===
@router.post("/{id_reserva}/cancelar", response_model=ReservaOut, status_code=status.HTTP_200_OK)
def cancelar_reserva(
    id_reserva: int,
    # body: CancelReservaIn | None = None,  # (opcional si definiste 'motivo')
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    res = Service.cancelar_mia(db, user_id=user.id_usuario, reserva_id=id_reserva)
    if isinstance(res, dict) and "error" in res:
        code = res["error"]
        if code == "not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
        if code == "forbidden":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No puedes cancelar reservas de otro usuario")
        if code == "bad_state":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"No se puede cancelar en estado '{res.get('estado')}'")
        if code == "too_late":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No se puede cancelar porque la reserva ya comenzó")
        # conflict u otro
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No fue posible cancelar la reserva")
    return res

# === Cancelar como dueño/admin/superadmin ===
@router.post("/{id_reserva}/cancelar-admin", response_model=ReservaOut, status_code=status.HTTP_200_OK)
def cancelar_reserva_admin(
    id_reserva: int,
    # body: CancelReservaIn | None = None,  # (opcional si definiste 'motivo')
    actor: Usuario = Depends(require_roles("dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    # Ajusta si tu campo es 'role' en vez de 'rol'
    is_admin = getattr(actor, "rol", None) in ("admin", "superadmin")
    res = Service.cancelar_por_actor(
        db, actor_id=actor.id_usuario, reserva_id=id_reserva, is_admin=is_admin
    )
    if isinstance(res, dict) and "error" in res:
        code = res["error"]
        if code == "not_found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")
        if code == "forbidden":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado para cancelar esta reserva")
        if code == "bad_state":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"No se puede cancelar en estado '{res.get('estado')}'")
        # conflict u otro
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="No fue posible cancelar la reserva")
    return res
