# app/modules/denuncias/router.py
from __future__ import annotations

from typing import List, Optional

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
    Path,
)
from sqlalchemy.orm import Session

from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario

from .schemas import (
    DenunciaCreateIn,
    DenunciaOut,
    DenunciaAdminReplyIn,
    EstadoDenuncia,
    CategoriaDenuncia,
    TipoMensaje,
)
from .service import DenunciasService

# -------------------------------------------------------------------
# Router normal (usuario autenticado)
# -------------------------------------------------------------------
router = APIRouter(
    prefix="/denuncias",
    tags=["denuncias / soporte / aportes"],
)

# -------------------------------------------------------------------
# Subrouter para panel (solo superadmin)
# -------------------------------------------------------------------
admin = APIRouter(
    prefix="/denuncias/admin",
    tags=["denuncias (panel)"],
)

# ===================================================================
# RUTAS PARA USUARIO (enviar denuncia / ver las propias)
# ===================================================================

@router.post(
    "",
    response_model=DenunciaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Enviar denuncia / queja / sugerencia sobre la plataforma",
    description=(
        "Permite a un **usuario autenticado** enviar una denuncia, queja, sugerencia, "
        "consulta o reporte de problema técnico.\n\n"
        "El usuario debe indicar:\n"
        "- `tipo_mensaje`: queja, sugerencia, consulta, problema_tecnico u otro.\n"
        "- `categoria`: general, reservas, pagos, canchas o app.\n\n"
        "Opcionalmente puede asociar la denuncia a un objeto específico:\n"
        "- Reserva (`tipo_objeto = 'reserva'`, `id_objeto = ID de la reserva`).\n"
        "- Cancha (`tipo_objeto = 'cancha'`, `id_objeto = ID de la cancha`).\n"
        "- Usuario (`tipo_objeto = 'usuario'`, `id_objeto = ID del usuario reportado`)."
    ),
    responses={
        201: {"description": "Denuncia creada correctamente"},
        400: {"description": "Error de validación"},
        401: {"description": "No autenticado"},
    },
)
def crear_denuncia(
    payload: DenunciaCreateIn,
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    """
    Flujo típico desde frontend:

    1. El usuario abre el formulario de contacto / soporte.
    2. Selecciona un **tipo de mensaje** (queja, sugerencia, etc.).
    3. Selecciona una **categoría** (general, reservas, pagos, canchas, app).
    4. Escribe un **título** y una **descripción** del problema o aporte.
    5. (Opcional) Relaciona la denuncia a una reserva, cancha, etc.
    6. Envía el formulario.\n
       → Se crea un registro en la tabla `denuncias` en estado inicial (por ej. `abierta`).
    """
    denuncia = DenunciasService.crear_denuncia(
        db,
        id_reportante=user.id_usuario,
        data=payload,
    )
    db.commit()
    return denuncia


@router.get(
    "/mias",
    response_model=List[DenunciaOut],
    summary="Mis denuncias / quejas / aportes",
    description=(
        "Devuelve todas las denuncias que ha creado el **usuario autenticado**, "
        "ordenadas de la más reciente a la más antigua.\n\n"
        "Útil para un apartado de **“Mis denuncias / Mis aportes”** en el perfil del usuario."
    ),
    responses={
        200: {"description": "Listado de denuncias del usuario"},
        401: {"description": "No autenticado"},
    },
)
def listar_mis_denuncias(
    user: Usuario = Depends(require_roles("usuario", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    """
    Permite al usuario ver el historial de todo lo que ha reportado:

    - Quejas que ha enviado.
    - Sugerencias o aportes a la plataforma.
    - Reportes de bugs o problemas técnicos.
    - Estado actual de cada denuncia.
    - Respuesta del superadmin cuando exista.
    """
    return DenunciasService.listar_mis_denuncias(
        db,
        id_reportante=user.id_usuario,
    )

# ===================================================================
# RUTAS PANEL SUPERADMIN (listar / ver detalle / responder)
# ===================================================================

@admin.get(
    "",
    response_model=List[DenunciaOut],
    summary="(Panel) Listar denuncias con filtros",
    description=(
        "Bandeja principal de denuncias para el **superadmin**.\n\n"
        "Filtros opcionales:\n"
        "- `estado`: filtra por estado de la denuncia "
        "(por ejemplo: abierta, en_revision, resuelta, cerrada).\n"
        "- `categoria`: general, reservas, pagos, canchas o app.\n"
        "- `tipo_mensaje`: queja, sugerencia, consulta, problema_tecnico, otro.\n\n"
        "Ideal para construir un listado tipo **inbox de soporte** en el panel."
    ),
    responses={
        200: {"description": "Listado de denuncias"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado (requiere superadmin)"},
    },
)
def listar_denuncias_admin(
    estado: Optional[EstadoDenuncia] = Query(
        default=None,
        description="Filtra por estado de la denuncia (abierta, en_revision, resuelta, cerrada).",
    ),
    categoria: Optional[CategoriaDenuncia] = Query(
        default=None,
        description="Filtra por categoría: general, reservas, pagos, canchas o app.",
    ),
    tipo_mensaje: Optional[TipoMensaje] = Query(
        default=None,
        description="Filtra por tipo de mensaje: queja, sugerencia, consulta, problema_tecnico, otro.",
    ),
    admin_user: Usuario = Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    """
    Solo visible para el **superadmin**.

    Desde este endpoint puedes:
    - Mostrar en frontend un listado de todas las denuncias.
    - Aplicar filtros por estado/categoría/tipo para gestionar mejor la carga de soporte.
    """
    return DenunciasService.listar_denuncias_admin(
        db,
        estado=estado,
        categoria=categoria,
        tipo_mensaje=tipo_mensaje,
    )


@admin.get(
    "/{id_denuncia:int}",
    response_model=DenunciaOut,
    summary="(Panel) Detalle de una denuncia",
    description=(
        "Muestra toda la información de una denuncia específica: datos del reportante, "
        "categoría, tipo de mensaje, descripción, estado actual y respuesta (si ya fue respondida)."
    ),
    responses={
        200: {"description": "Detalle de la denuncia"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado (requiere superadmin)"},
        404: {"description": "Denuncia no encontrada"},
    },
)
def detalle_denuncia_admin(
    id_denuncia: int = Path(..., gt=0, description="ID de la denuncia"),
    admin_user: Usuario = Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    """
    Se usa desde el panel cuando el superadmin hace clic sobre una denuncia
    para ver su detalle completo antes de responderla.
    """
    denuncia = DenunciasService.obtener_denuncia(db, id_denuncia)
    if not denuncia:
        raise HTTPException(status_code=404, detail="Denuncia no encontrada")
    return denuncia


@admin.post(
    "/{id_denuncia:int}/responder",
    response_model=DenunciaOut,
    summary="(Panel) Responder denuncia / queja / aporte",
    description=(
        "Permite al **superadmin** escribir una respuesta a la denuncia y cambiar su estado.\n\n"
        "La respuesta se guarda en `respuesta_admin`, junto con:\n"
        "- `id_admin_resp`: ID del superadmin que respondió.\n"
        "- `responded_at`: fecha y hora de la respuesta.\n\n"
        "Desde frontend esto se usa para mostrarle al usuario la respuesta en su sección "
        "de **Mis denuncias**."
    ),
    responses={
        200: {"description": "Denuncia respondida correctamente"},
        401: {"description": "No autenticado"},
        403: {"description": "No autorizado (requiere superadmin)"},
        404: {"description": "Denuncia no encontrada"},
    },
)
def responder_denuncia_admin(
    id_denuncia: int = Path(..., gt=0, description="ID de la denuncia a responder"),
    payload: DenunciaAdminReplyIn = ...,
    admin_user: Usuario = Depends(require_roles("superadmin")),
    db: Session = Depends(get_db),
):
    """
    Flujo típico en el panel:

    1. El superadmin abre la denuncia en detalle.
    2. Escribe una **respuesta** que verá el usuario (por ejemplo, cómo se solucionó el problema).
    3. Selecciona un **nuevo estado** (ej: `resuelta` o `cerrada`).
    4. Envía el formulario.\n
       → Se actualiza la fila en la tabla `denuncias` con la respuesta y el estado.\n
       → Opcionalmente, puedes enganchar aquí una **notificación** o **correo** al usuario.
    """
    denuncia = DenunciasService.responder_denuncia(
        db,
        id_denuncia=id_denuncia,
        id_admin=admin_user.id_usuario,
        data=payload,
    )

    if not denuncia:
        raise HTTPException(status_code=404, detail="Denuncia no encontrada")

    db.commit()
    return denuncia


# -------------------------------------------------------------------
# Montar el subrouter admin debajo del mismo módulo
# Quedarán rutas:
# - /denuncias/...          → usuario
# - /denuncias/admin/...    → panel superadmin
# -------------------------------------------------------------------
router.include_router(admin)
