from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.shared.deps import get_db
from .service import disponibilidad_por_dia, disponibilidad_rango

router = APIRouter(prefix="/disponibilidad", tags=["disponibilidad"])

@router.get(
    "",
    response_model=dict | list[dict],
    summary="Consultar slots disponibles",
    description=(
        "Retorna los **slots libres** de una cancha para un día o un rango de días.\n\n"
        "Reglas aplicadas:\n"
        "• Horario por **cancha** (prioridad) o **complejo** (fallback).\n"
        "• Descuenta **bloqueos** y **reservas** (pendiente/confirmada).\n"
        "• Incluye **precio** si existe una regla que cubra completamente el slot.\n\n"
        "**Usa uno de:** `fecha` **o** (`fecha_inicio` y `fecha_fin`)."
    ),
    responses={
        200: {
            "content": {
                "application/json": {
                    "examples": {
                        "un_dia": {
                            "summary": "Slots de 60 min para un día",
                            "value": [
                                {
                                    "inicio": "2025-10-21T09:00:00-03:00",
                                    "fin": "2025-10-21T10:00:00-03:00",
                                    "etiqueta": "09:00–10:00",
                                    "precio": 8000.0
                                },
                                {
                                    "inicio": "2025-10-21T10:00:00-03:00",
                                    "fin": "2025-10-21T11:00:00-03:00",
                                    "etiqueta": "10:00–11:00",
                                    "precio": 8000.0
                                }
                            ]
                        },
                        "rango_de_dias": {
                            "summary": "Slots por día entre 20–22 Oct",
                            "value": {
                                "2025-10-20": [],
                                "2025-10-21": [
                                    {
                                        "inicio": "2025-10-21T09:00:00-03:00",
                                        "fin": "2025-10-21T10:30:00-03:00",
                                        "etiqueta": "09:00–10:30",
                                        "precio": 12000.0
                                    }
                                ],
                                "2025-10-22": [
                                    {
                                        "inicio": "2025-10-22T11:00:00-03:00",
                                        "fin": "2025-10-22T12:30:00-03:00",
                                        "etiqueta": "11:00–12:30",
                                        "precio": 1
                                    }
                                ]
                            }
                        }
                    }
                }
            }
        },
        400: {"description": "Faltan parámetros de fecha."},
        422: {"description": "Rango de fechas inválido (fecha_fin < fecha_inicio)."}
    }
)
def get_disponibilidad(
    id_cancha: int = Query(..., ge=1, description="ID de la cancha."),
    slot_minutos: int = Query(60, ge=15, le=240, description="Tamaño de cada slot en minutos."),
    fecha: date | None = Query(None, description="Día específico (YYYY-MM-DD)."),
    fecha_inicio: date | None = Query(None, description="Inicio del rango (YYYY-MM-DD)."),
    fecha_fin: date | None = Query(None, description="Fin del rango (YYYY-MM-DD)."),
    db: Session = Depends(get_db)
):
    if fecha:
        return disponibilidad_por_dia(db, id_cancha, fecha, slot_minutos)
    if fecha_inicio and fecha_fin:
        if fecha_fin < fecha_inicio:
            raise HTTPException(422, "fecha_fin debe ser ≥ fecha_inicio")
        return disponibilidad_rango(db, id_cancha, fecha_inicio, fecha_fin, slot_minutos)
    raise HTTPException(400, "Proporciona fecha o (fecha_inicio y fecha_fin)")
