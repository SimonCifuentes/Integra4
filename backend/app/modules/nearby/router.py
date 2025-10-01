# backend/app/modules/nearby/router.py
from __future__ import annotations
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.shared.deps import get_db
from app.modules.canchas.schemas import CanchasListOut, CanchasQuery
from app.modules.canchas.service import list_canchas as svc_list

router = APIRouter(prefix="/nearby", tags=["nearby"])

@router.get(
    "/canchas",
    response_model=CanchasListOut,
    summary="Canchas cercanas (alias de /canchas con lat/lon/max_km)",
    responses={
        200: {
            "description": "Canchas dentro del radio solicitado",
            "content": {
                "application/json": {
                    "example": {
                        "items": [
                            {
                                "id_cancha": 45,
                                "id_complejo": 12,
                                "nombre": "Cancha 7",
                                "deporte": "fútbol",
                                "cubierta": False,
                                "activo": True,
                                "precio_desde": 12000.0,
                                "rating_promedio": 4.4,
                                "total_resenas": 54,
                                "distancia_km": 1.35
                            }
                        ],
                        "total": 1,
                        "page": 1,
                        "page_size": 20
                    }
                }
            }
        },
        422: {"description": "Parámetros inválidos"}
    }
)
def nearby_canchas(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    max_km: float = Query(5.0, gt=0, le=25.0),
    deporte: str | None = None,
    cubierta: bool | None = Query(None, description="alias: techada"),
    iluminacion: bool | None = None,
    max_precio: float | None = Query(None, ge=0),
    sort_by: str | None = Query("distancia", pattern="^(distancia|precio|rating|nombre|recientes)$"),
    order: str | None = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    params = CanchasQuery(
        q=None,
        id_complejo=None,
        deporte=deporte,
        cubierta=cubierta,
        iluminacion=iluminacion,
        max_precio=max_precio,
        lat=lat, lon=lon, max_km=max_km,
        sort_by=sort_by, order=order,
        page=page, page_size=page_size,
    )
    return svc_list(db, params)
