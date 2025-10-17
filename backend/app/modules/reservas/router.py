from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.reservas.schemas import ReservaCreateIn, ReservaOut
from app.modules.reservas.service import Service
from app.modules.reservas.schemas import QuoteIn, QuoteOut  # ← NUEVO
from sqlalchemy import text
from app.modules.auditoria.repository import logs_de_reserva


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

# === Cotización (no crea reserva) ===
@router.post("/quote", response_model=QuoteOut, status_code=status.HTTP_200_OK)
def quote_reserva(
    body: QuoteIn,
    db: Session = Depends(get_db),
):
    """
    Calcula el precio para la franja indicada segmentando por reglas vigentes y aplicando IVA.
    No crea la reserva.
    """
    return Service.cotizar(db, data=body)

@router.get("/{id_reserva}/logs")
def ver_logs_reserva(
    id_reserva: int,
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    """
    Devuelve los eventos de auditoría asociados a una reserva.
    Autorizado si:
      - el usuario es dueño de la reserva
      - o es dueño del complejo de esa reserva
      - o es admin/superadmin
    """
    is_admin = getattr(user, "rol", None) in ("admin", "superadmin")

    row = db.execute(text("""
        SELECT r.id_usuario, co.id_dueno AS dueno_id
        FROM reservas r
        JOIN canchas c    ON c.id_cancha = r.id_cancha
        JOIN complejos co ON co.id_complejo = c.id_complejo
        WHERE r.id_reserva = :rid
        LIMIT 1
    """), {"rid": id_reserva}).mappings().one_or_none()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reserva no encontrada")

    es_propietario = (row["id_usuario"] == user.id_usuario)
    es_dueno = (row["dueno_id"] == user.id_usuario)

    if not (is_admin or es_propietario or es_dueno):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No autorizado")

    return logs_de_reserva(db, id_reserva=id_reserva, limit=100, offset=0)
