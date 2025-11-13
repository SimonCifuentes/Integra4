# app/modules/notificaciones/schemas.py
from datetime import datetime
from pydantic import BaseModel, Field


class NotificacionBase(BaseModel):
    titulo: str = Field(..., max_length=160)
    cuerpo: str = Field(..., description="Texto de la notificación")


class NotificacionCreateIn(NotificacionBase):
    id_destinatario: int = Field(..., gt=0, description="ID del usuario destinatario")


class NotificacionOut(NotificacionBase):
    id_notificacion: int
    id_destinatario: int
    leida: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificacionEmailIn(BaseModel):
    """
    Input para crear notificación + enviar correo.
    """
    id_destinatario: int = Field(..., gt=0)
    titulo: str = Field(..., max_length=160)
    cuerpo: str
