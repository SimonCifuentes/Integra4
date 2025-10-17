# app/modules/reservas/router.py
from fastapi import APIRouter, Depends, Query, Path, status
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.reservas.schemas import ReservaOut, ReservaCreateIn, QuoteIn, QuoteOut, ReservaPatchIn
from app.modules.reservas.service import Service

router = APIRouter(prefix="/reservas", tags=["reservas"])

@router.get(
    "/mias",
    response_model=list[ReservaOut],
    summary="Mis reservas",
    description="Lista las reservas del usuario autenticado (rol: usuario/admin/superadmin)."
)
def mis_reservas(
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.mias(db, user_id=user.id_usuario)

@router.get(
    "",
    response_model=list[ReservaOut],
    summary="Listado (admin: su complejo; superadmin: todas)",
    description="Admin solo ve su complejo y canchas propias. Superadmin ve todo."
)
def listar_reservas(
    estado: str | None = Query(None, regex="^(pendiente|confirmada|cancelada|expirada)$"),
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    hasta: str | None = Query(None, description="YYYY-MM-DD"),
    id_complejo: int | None = Query(None, gt=0, description="Opcional: debe pertenecer al admin"),
    id_cancha: int | None = Query(None, gt=0, description="Opcional: debe pertenecer al admin"),
    user: Usuario = Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db)
):
    filtros = {"estado": estado, "desde": desde, "hasta": hasta,
               "id_complejo": id_complejo, "id_cancha": id_cancha}
    return Service.listar(db, filtros=filtros, user=user)

@router.get(
    "/{id_reserva}",
    response_model=ReservaOut,
    summary="Detalle",
    description="Usuario ve lo suyo. Admin solo si la reserva pertenece a su complejo. Superadmin ve todo."
)
def detalle_reserva(
    id_reserva: int = Path(..., gt=0),
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.detalle(db, id_reserva, user)

@router.post(
    "/cotizar",
    response_model=QuoteOut,
    summary="Cotizar",
    description="Calcula precio (reglas + promo)."
)
def cotizar(
    body: QuoteIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.cotizar(db, body.dict(), user_id=user.id_usuario)

@router.post(
    "",
    response_model=ReservaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crear",
    description="Crea en estado `pendiente` si hay disponibilidad."
)
def crear_reserva(
    body: ReservaCreateIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.crear(db, body.dict(), user_id=user.id_usuario)

@router.patch(
    "/{id_reserva}",
    response_model=ReservaOut,
    summary="Reprogramar/editar",
    description="Usuario: solo reservas propias. Admin: solo si pertenece a su complejo. Superadmin: todo."
)
def editar_reserva(
    id_reserva: int,
    body: ReservaPatchIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.editar(db, id_reserva, body.dict(exclude_unset=True), user)

@router.post(
    "/{id_reserva}/confirmar",
    response_model=ReservaOut,
    summary="Confirmar (admin/superadmin)",
    description="Admin solo puede confirmar reservas de su complejo."
)
def confirmar_reserva(
    id_reserva: int,
    user: Usuario = Depends(require_roles("admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.confirmar(db, id_reserva, user)

@router.post(
    "/{id_reserva}/cancelar",
    response_model=ReservaOut,
    summary="Cancelar",
    description="Usuario cancela lo suyo. Admin solo reservas de su complejo. Superadmin cualquiera."
)
def cancelar_reserva(
    id_reserva: int,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db)
):
    return Service.cancelar(db, id_reserva, user)
