from fastapi import APIRouter

router = APIRouter(prefix="/complejos", tags=["catálogo (vacío)"])

@router.get(
    "",
    summary="Listar complejos (catálogo vacío)",
    description="Endpoint temporal que retorna una lista vacía.",
    responses={
        200: {
            "description": "OK",
            "content": {"application/json": {"example": []}},
        }
    }
)
def list_complejos_vacio():
    return []
