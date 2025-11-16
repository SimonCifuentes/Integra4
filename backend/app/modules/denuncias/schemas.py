# app/modules/denuncias/schemas.py
from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field

# -------------------------------------------------------------------
# Tipos para documentar bien en Swagger (ajusta si cambias frontend)
# -------------------------------------------------------------------

TipoMensaje = Literal["queja", "sugerencia", "consulta", "problema_tecnico", "otro"]

CategoriaDenuncia = Literal[
    "general",   # Administración general de la plataforma
    "reservas",  # Sistema de reservas, cancelaciones, horarios, etc.
    "pagos",     # Pagos, reembolsos, facturación
    "canchas",   # Canchas y complejos
    "app",       # Errores técnicos de la web o app móvil
]

# ⚠ Ajusta estos valores a los de tu ENUM estado_denuncia
EstadoDenuncia = Literal["abierta", "en_revision", "resuelta", "cerrada"]


class DenunciaBase(BaseModel):
    """
    Datos comunes de una denuncia / queja / sugerencia enviada por un usuario.
    """

    tipo_mensaje: TipoMensaje = Field(
        ...,
        description=(
            "Tipo de mensaje que envía el usuario:\n"
            "- `queja`: Reclamo o inconformidad.\n"
            "- `sugerencia`: Propuesta de mejora.\n"
            "- `consulta`: Duda o pregunta.\n"
            "- `problema_tecnico`: Error técnico o bug.\n"
            "- `otro`: Cualquier otro tipo de mensaje."
        ),
        example="queja",
    )

    categoria: CategoriaDenuncia = Field(
        ...,
        description=(
            "Área de la plataforma a la que apunta la denuncia o aporte:\n"
            "- `general`: Administración general.\n"
            "- `reservas`: Sistema de reservas y cancelaciones.\n"
            "- `pagos`: Pagos, reembolsos, facturación.\n"
            "- `canchas`: Canchas y complejos.\n"
            "- `app`: App web o móvil (bugs, UX, rendimiento)."
        ),
        example="app",
    )

    titulo: str = Field(
        ...,
        max_length=120,
        description="Título breve que resuma la denuncia, queja o aporte.",
        example="La app se cierra al intentar confirmar una reserva",
    )

    descripcion: str = Field(
        ...,
        max_length=4000,
        description=(
            "Descripción detallada de lo que ocurre, pasos para reproducir el problema "
            "o explicación de la sugerencia / aporte."
        ),
        example=(
            "En Android 14, cuando entro a 'Mis reservas' y presiono confirmar, "
            "la app se cierra y vuelve al inicio."
        ),
    )

    # Campos opcionales para enlazar la denuncia a un objeto concreto
    tipo_objeto: Optional[str] = Field(
        None,
        description=(
            "Tipo de objeto relacionado (opcional). "
            "Ejemplos: `reserva`, `cancha`, `complejo`, `usuario`, `app`."
        ),
        example="reserva",
    )

    id_objeto: Optional[int] = Field(
        None,
        description=(
            "ID del objeto relacionado (opcional). "
            "Por ejemplo, ID de la reserva, cancha o usuario reportado."
        ),
        example=123,
    )


class DenunciaCreateIn(DenunciaBase):
    """
    Payload que envía el usuario para crear una nueva denuncia / queja / aporte.
    """
    pass


class DenunciaAdminReplyIn(BaseModel):
    """
    Payload que envía el SUPER ADMIN para responder una denuncia.
    """

    respuesta: str = Field(
        ...,
        max_length=4000,
        description="Respuesta del super admin que verá el usuario en su denuncia.",
        example="Gracias por el reporte, ya corregimos el error en la última actualización.",
    )

    estado: EstadoDenuncia = Field(
        "resuelta",
        description=(
            "Nuevo estado de la denuncia tras la respuesta. "
            "Ajusta los valores a tu ENUM `estado_denuncia`."
        ),
        example="resuelta",
    )


class DenunciaOut(DenunciaBase):
    """
    Modelo de salida para listar / ver denuncias, tanto para usuario como para admin.
    """

    id_denuncia: int = Field(..., description="ID interno de la denuncia.")
    id_reportante: int = Field(..., description="ID del usuario que creó la denuncia.")
    estado: str = Field(
        ...,
        description="Estado actual de la denuncia (valor del ENUM `estado_denuncia`).",
    )

    tipo_mensaje: TipoMensaje
    categoria: CategoriaDenuncia

    respuesta_admin: Optional[str] = Field(
        None,
        description="Respuesta escrita por el super admin (si ya fue respondida).",
    )
    id_admin_resp: Optional[int] = Field(
        None,
        description="ID del super admin que respondió la denuncia (si aplica).",
    )
    responded_at: Optional[datetime] = Field(
        None,
        description="Fecha y hora en que el super admin respondió (si aplica).",
    )
    created_at: datetime = Field(..., description="Fecha y hora en que se creó la denuncia.")
    updated_at: datetime = Field(..., description="Última fecha de actualización del registro.")

    class Config:
        orm_mode = True
