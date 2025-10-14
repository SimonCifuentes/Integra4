from fastapi import APIRouter, Depends, status, Body, Path
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from .schemas import HorarioCreate, HorarioPatch
from .service import crear, actualizar_parcial, eliminar

router = APIRouter(prefix="/horarios", tags=["horarios"])

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Crear horario recurrente",
    description=(
        "Crea un **horario de atención** por día de semana. "
        "Puede ser a nivel **cancha** (id_cancha != null) o **general del complejo** (id_cancha = null). "
        "El horario de **cancha** tiene prioridad sobre el del **complejo**."
    ),
    responses={
        201: {
            "content": {
                "application/json": {
                    "example": {"id_horario": 45}
                }
            }
        },
        422: {"description": "Validación: hora_apertura < hora_cierre."}
    }
)
def crear_horario(
    body: HorarioCreate = Body(
        ...,
        examples={
            "por_cancha": {
                "summary": "Horario para una cancha",
                "value": {
                    "id_complejo": 1,
                    "id_cancha": 1,
                    "dia": "domingo",
                    "hora_apertura": "09:00:00",
                    "hora_cierre": "22:00:00"
                }
            },
            "general_de_complejo": {
                "summary": "Horario general del complejo",
                "value": {
                    "id_complejo": 1,
                    "id_cancha": 1,
                    "dia": "lunes",
                    "hora_apertura": "08:00:00",
                    "hora_cierre": "23:00:00"
                }
            }
        }
    ),
    user: Usuario = Depends(require_roles("dueno","admin","superadmin")),
    db: Session = Depends(get_db)
):
    hid = crear(db, body.dict())
    db.commit()
    return {"id_horario": hid}

@router.patch(
    "/{id_horario}",
    response_model=dict,
    summary="Actualizar parcialmente un horario",
    description=(
        "Actualiza campos de un horario existente: `dia`, `hora_apertura`, `hora_cierre`. "
        "Valida que `hora_apertura < hora_cierre` si se envían ambas."
    ),
    responses={
        200: {
            "content": {"application/json": {"example": {"ok": True}}}
        },
        404: {"description": "Horario no encontrado."}
    }
)
def patch_horario(
    id_horario: int = Path(..., ge=1, description="ID del horario."),
    body: HorarioPatch = Body(
        ...,
        examples={
            "cambiar_horas": {
                "summary": "Cambiar apertura y cierre",
                "value": {
                    "hora_apertura": "10:00:00",
                    "hora_cierre": "21:30:00"
                }
            },
            "cambiar_dia": {
                "summary": "Cambiar día",
                "value": {"dia": "sabado"}
            }
        }
    ),
    user: Usuario = Depends(require_roles("dueno","admin","superadmin")),
    db: Session = Depends(get_db)
):
    actualizar_parcial(db, id_horario, {k:v for k,v in body.dict().items() if v is not None})
    db.commit()
    return {"ok": True}

@router.delete(
    "/{id_horario}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar horario",
    description="Elimina un horario por su ID. Retorna 204 si la eliminación fue exitosa."
)
def delete_horario(
    id_horario: int = Path(..., ge=1, description="ID del horario."),
    user: Usuario = Depends(require_roles("dueno","admin","superadmin")),
    db: Session = Depends(get_db)
):
    eliminar(db, id_horario)
    db.commit()
    return
