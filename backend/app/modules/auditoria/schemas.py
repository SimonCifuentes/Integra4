from datetime import datetime
from typing import Any, Optional, Dict
from pydantic import BaseModel

class AuditoriaOut(BaseModel):
    id_auditoria: int
    actor_id: Optional[int]
    accion: str
    snapshot: Optional[Dict[str, Any]]
    ip: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
