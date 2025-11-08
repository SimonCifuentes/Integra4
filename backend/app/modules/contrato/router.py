# backend/app/modules/contrato/router.py
# Auto-added module to serve the Contract & Examples markdown
from fastapi import APIRouter, Response
from pathlib import Path

router = APIRouter(prefix="/docs", tags=["docs"])

@router.get("/contrato", summary="Contrato y ejemplos (Markdown)")
def contrato_md():
    md_path = Path(__file__).resolve().parents[2] / "docs" / "CONTRATO_Y_EJEMPLOS.md"
    if md_path.exists():
        return Response(md_path.read_text(encoding="utf-8"), media_type="text/markdown; charset=utf-8")
    return {"detail": "Documento no encontrado"}
