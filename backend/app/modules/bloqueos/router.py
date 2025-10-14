from fastapi import APIRouter, Depends, status, Body, Path
from sqlalchemy.orm import Session
from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from .schemas import BloqueoCreate
from .service import crear, eliminar

router = APIRouter(prefix="/bloqueos", tags=["bloqueos"])

@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=dict,
    summary="Crear bloqueo de agenda",
    description=(
        "Crea un **bloqueo** para una cancha con rango `inicio`–`fin` (TIMESTAMPTZ). "
        "Los bloqueos impiden tomar reservas en el rango indicado."
    ),
    responses={
        201: {
            "content": {
                "application/json": {
                    "example": {"id_bloqueo": 123}
                }
            }
        }
    }
)
def crear_bloqueo(
    body: BloqueoCreate = Body(
        ...,
        examples={
            "parcial_dia": {
                "summary": "Bloqueo parcial dentro del día",
                "value": {
                    "id_cancha": 1,
                    "inicio": "2025-10-21T09:00:00-03:00",
                    "fin": "2025-10-21T13:00:00-03:00",
                    "motivo": "Mantención"
                }
            },
            "todo_un_dia": {
                "summary": "Bloqueo día completo",
                "value": {
                    "id_cancha": 1,
                    "inicio": "2025-10-22T00:00:00-03:00",
                    "fin": "2025-10-23T00:00:00-03:00",
                    "motivo": "Cierre por evento"
                }
            }
        }
    ),
    user: Usuario = Depends(require_roles("dueno","admin","superadmin")),
    db: Session = Depends(get_db)
):
    bloqueo_id = crear(db, body.dict())
    db.commit()
    return {"id_bloqueo": bloqueo_id}

@router.delete(
    "/{id_bloqueo}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Eliminar bloqueo",
    description="Elimina un bloqueo por su ID. Retorna 204 si la eliminación fue exitosa."
)
def eliminar_bloqueo(
    id_bloqueo: int = Path(..., ge=1, description="ID del bloqueo."),
    user: Usuario = Depends(require_roles("dueno","admin","superadmin")),
    db: Session = Depends(get_db)
):
    eliminar(db, id_bloqueo)
    db.commit()
    return
