# app/modules/resenas/router.py
# ─────────────────────────────────────────────────────────────────────────────
# Endpoints de Reseñas para SportHubTemuco
# - GET    /resenas                      → Lista reseñas (por cancha o complejo) + rating agregado
# - POST   /resenas                      → Crea reseña si el usuario consumió una reserva confirmada
# - PATCH  /resenas/{id_resena}          → Edita solo reseña propia
# - DELETE /resenas/{id_resena}          → Borra reseña (autor / superadmin / admin/dueno del propio complejo)
# - POST   /resenas/{id_resena}/reportar → Reporta reseña (1 reporte por usuario por reseña)
#
# Notas:
# * En BD la columna es `puntuacion` (smallint). En la API exponemos `calificacion` (1..5).
# * El rating agregado (promedio y total) se calcula solo cuando filtras por id_cancha o id_complejo.
# * Permisos:
#     - usuario: puede crear (si consumió reserva), editar/borrar su propia reseña, reportar.
#     - dueno/admin: además pueden borrar/moderar reseñas de SUS complejos/canchas.
#     - superadmin: puede todo.
# ─────────────────────────────────────────────────────────────────────────────

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, Path, Body, status
from sqlalchemy.orm import Session

from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from .schemas import (
    ResenaCreateIn, ResenaUpdateIn, ResenaOut,
    ReporteIn, ReporteOut, OrderType
)
from .service import Service

router = APIRouter(prefix="/resenas", tags=["resenas"])

# ─────────────────────────────────────────────────────────────────────────────
# GET /resenas
# Lista reseñas por destino (cancha/complejo) con orden y paginación.
# Si se filtra por uno de los dos, se incluyen `promedio_rating` y `total_resenas`.
# No requiere autenticación.
# ─────────────────────────────────────────────────────────────────────────────
@router.get(
    "",
    response_model=list[ResenaOut],
    summary="Lista reseñas (por cancha o por complejo)",
    description=(
        "Devuelve reseñas filtradas por **cancha** (`id_cancha`) **o** por **complejo** (`id_complejo`). "
        "Incluye `promedio_rating` y `total_resenas` cuando hay filtro por objetivo. "
        "Permite ordenar por `recientes`, `mejor` o `peor`."
    ),
    operation_id="listResenas",
    responses={
        200: {"description": "Listado paginado de reseñas"},
        400: {"description": "Parámetros inválidos o error al procesar la consulta"},
    },
)
def list_resenas(
    id_cancha: Annotated[int | None, Query(description="ID de la cancha")] = None,
    id_complejo: Annotated[int | None, Query(description="ID del complejo")] = None,
    order: Annotated[OrderType, Query(description="Orden: `recientes` | `mejor` | `peor`")] = "recientes",
    page: Annotated[int, Query(ge=1, description="Página (1..N)")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Tamaño de página (1..100)")] = 20,
    db: Session = Depends(get_db),
):
    try:
        return Service.list(
            db, id_cancha=id_cancha, id_complejo=id_complejo,
            order=order, page=page, page_size=page_size
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# POST /resenas
# Crea una reseña de una cancha o de un complejo.
# Regla de negocio: solo si el usuario consumió (hora pasada) una reserva confirmada
# del objetivo indicado (cancha/complejo). Service.crear valida esto.
# Permisos: usuario/dueno/admin/superadmin autenticados.
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "",
    response_model=ResenaOut,
    status_code=status.HTTP_201_CREATED,
    summary="Crea una reseña (reserva confirmada)",
    description=(
        "Crea una reseña para **cancha** (`id_cancha`) o **complejo** (`id_complejo`). "
        "Solo se permite si el usuario tiene **al menos una reserva confirmada** "
        "para el destino indicado. No es necesario que la hora haya finalizado."
    ),
    operation_id="createResena",
)
def crear_resena(
    body: Annotated[
        ResenaCreateIn,
        Body(
            description="Datos de la reseña (id_cancha o id_complejo, calificacion 1..5, comentario opcional)",
            examples={
                "cancha": {"value": {"id_cancha": 14, "calificacion": 5, "comentario": "Excelente!"}},
                "complejo": {"value": {"id_complejo": 4, "calificacion": 4, "comentario": "Bueno en general"}},
            },
        ),
    ],
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    try:
        return Service.crear(db, user_id=user.id_usuario, body=body)
    except PermissionError as e:
        # No tiene reserva confirmada para ese destino
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# PATCH /resenas/{id_resena}
# Edita una reseña existente, pero únicamente si el solicitante es su autor.
# Campos editables: calificacion y/o comentario (ambos opcionales).
# Permisos: usuario/dueno/admin/superadmin (autor).
# ─────────────────────────────────────────────────────────────────────────────
@router.patch(
    "/{id_resena}",
    response_model=ResenaOut,
    summary="Edita una reseña propia",
    description=(
        "Edita **solo** la reseña del propio usuario. Campos editables: `calificacion` y/o `comentario`.\n\n"
        "**Permisos:** `usuario`, `dueno`, `admin`, `superadmin` (debes ser **autor**)."
    ),
    operation_id="updateResena",
    responses={
        200: {"description": "Reseña actualizada"},
        400: {"description": "Datos inválidos"},
        403: {"description": "No autorizado (no eres autor)"},
        404: {"description": "Reseña no encontrada"},
    },
)
def editar_resena(
    id_resena: Annotated[int, Path(description="ID de la reseña a editar")],
    body: Annotated[
        ResenaUpdateIn,
        Body(
            description="Campos a actualizar (cualquiera de los dos)",
            examples={
                "soloComentario": {"value": {"comentario": "Corrijo mi opinión luego de otra visita"}},
                "soloCalificacion": {"value": {"calificacion": 3}},
                "ambos": {"value": {"calificacion": 4, "comentario": "Buena experiencia general"}},
            },
        ),
    ],
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    try:
        res = Service.editar(db, user_id=user.id_usuario, id_resena=id_resena, body=body)
        if not res:
            raise HTTPException(status_code=404, detail="Reseña no encontrada")
        return res
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# DELETE /resenas/{id_resena}
# Borrado con escalamiento de permisos:
# - Autor: siempre puede borrar su propia reseña.
# - superadmin: puede borrar cualquier reseña.
# - admin/dueno: pueden borrar reseñas de canchas/complejos que administran/poseen.
# Service.borrar contiene la lógica de comprobación (incluye resolver complejo desde cancha).
# ─────────────────────────────────────────────────────────────────────────────
@router.delete(
    "/{id_resena}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Borra una reseña (propia o por moderación)",
    description=(
        "Borrado con escalamiento de permisos:\n"
        "- **Autor**: puede borrar su propia reseña.\n"
        "- **superadmin**: puede borrar **cualquier** reseña.\n"
        "- **admin/dueno**: pueden borrar reseñas **solo** de canchas/complejos que administran/poseen."
    ),
    operation_id="deleteResena",
    responses={
        204: {"description": "Eliminada"},
        403: {"description": "No autorizado para borrar"},
        400: {"description": "Solicitud inválida u otro error"},
    },
)
def borrar_resena(
    id_resena: Annotated[int, Path(description="ID de la reseña a borrar")],
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    try:
        # Pasa user_id y user_rol; Service resuelve si puede moderar según reglas arriba.
        Service.borrar(db, user_id=user.id_usuario, user_rol=user.rol, id_resena=id_resena)
        return
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# POST /resenas/{id_resena}/reportar
# Reporte de contenido inapropiado. 1 reporte por usuario por reseña (UPSERT).
# No borra ni oculta; sirve para moderación posterior.
# Permisos: cualquier usuario autenticado (usuario/dueno/admin/superadmin).
# ─────────────────────────────────────────────────────────────────────────────
@router.post(
    "/{id_resena}/reportar",
    response_model=ReporteOut,
    status_code=status.HTTP_201_CREATED,
    summary="Reporta una reseña por contenido inapropiado",
    description=(
        "Crea/actualiza un **reporte** sobre una reseña (1 por usuario y reseña). "
        "Sirve para moderación; **no** borra ni oculta la reseña.\n\n"
        "**Permisos:** `usuario`, `dueno`, `admin`, `superadmin` autenticados."
    ),
    operation_id="reportResena",
    responses={
        201: {"description": "Reporte creado/actualizado"},
        404: {"description": "Reseña no encontrada"},
        400: {"description": "Solicitud inválida u otro error"},
    },
)
def reportar_resena(
    id_resena: Annotated[int, Path(description="ID de la reseña a reportar")],
    body: Annotated[
        ReporteIn,
        Body(
            description="Motivo opcional del reporte (texto breve)",
            examples={
                "sinMotivo": {"value": {"motivo": None}},
                "conMotivo": {"value": {"motivo": "Lenguaje ofensivo / insultos directos"}},
            },
        ),
    ],
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
    db: Session = Depends(get_db),
):
    try:
        return Service.reportar(db, id_resena=id_resena, user_id=user.id_usuario, motivo=body.motivo)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
