# Cómo integrar el módulo de Contrato y Ejemplos

Edita `backend/app/api/v1/router.py` y agrega lo siguiente:
```python
# ➊ Agregar import
from app.modules.contrato.router import router as contrato

# ➋ Incluir router (por ejemplo después de otros include_router)
api_router.include_router(contrato)
