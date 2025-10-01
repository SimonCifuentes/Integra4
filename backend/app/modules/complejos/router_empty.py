from fastapi import APIRouter

router = APIRouter(prefix="/canchas", tags=["catálogo (vacío)"])

@router.get(
    "",
    summary="Listar canchas (catálogo vacío)",
    description="Endpoint temporal que retorna una lista vacía.",
    responses={
        200: {
            "description": "OK",
            "content": {"application/json": {"example": []}},
        }
    }
)
def list_canchas_vacio():
    return []
