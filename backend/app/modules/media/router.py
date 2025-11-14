# app/modules/media/router.py
from typing import Annotated, List
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    Query,
    Path,
)
from sqlalchemy.orm import Session

from app.shared.deps import get_db, require_roles
from app.modules.auth.model import Usuario
from app.modules.media.schemas import (
    MediaTarget,
    ReorderIn,
    SetPrincipalOut,
    MediaListOut,
    MediaOut,
)
from app.modules.media.service import (
    upload_media,
    list_media,
    delete_media,
    set_principal,
    bulk_reorder,
    replace_media_file,
)

router = APIRouter(
    prefix="/media",
    tags=["media"],
)


def _norm_target(t: str) -> MediaTarget:
    """
    Normaliza el target a: 'perfil', 'cancha' o 'complejo'.

    Si llega cualquier otra cosa, lanza un 422 que también se ve en Swagger.
    """
    t = (t or "").strip().lower()
    if t in ("perfil", "cancha", "complejo"):
        return t  # type: ignore[return-value]
    raise HTTPException(
        status_code=422,
        detail="target debe ser 'perfil', 'cancha' o 'complejo'",
    )


# ---------------------------------------------------------------------------
#  POST /media
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=int,
    summary="Subir imagen (perfil, cancha o complejo)",
    description="""
Sube un archivo de imagen a Cloudflare R2 y crea el registro correspondiente en la tabla `medios`.

**Targets posibles (campo `target`):**
- `perfil` → foto de perfil de un usuario.
- `cancha` → fotos de una cancha específica.
- `complejo` → fotos de un complejo deportivo.

**Comportamiento de permisos (según el usuario autenticado):**
- `superadmin` → puede subir imágenes para cualquier usuario, cancha o complejo.
- `admin` / `dueno` → pueden subir imágenes solo de **sus propios** complejos y canchas (donde ellos son `id_dueno`).
- `usuario` → solo puede subir/editar **su propia foto de perfil** (`target=perfil` y `target_id` = su `id_usuario`).

**Notas importantes:**
- El endpoint recibe **multipart/form-data**.
- Los tipos de imagen aceptados son: `jpeg`, `png`, `webp` (según cabecera o contenido del archivo).
- El valor retornado es el `id_media` recién creado en la base de datos.

**Ejemplos de uso (conceptual):**
- Subir foto de perfil:
  - `target = "perfil"`
  - `target_id = ID_DEL_USUARIO_LOGUEADO`
- Subir foto principal de una cancha:
  - `target = "cancha"`
  - `target_id = ID_DE_LA_CANCHA`
  - `es_principal = true`
""",
)
def create_media(
    target: Annotated[
        str,
        Form(
            description="Target al que pertenece la imagen: 'perfil', 'cancha' o 'complejo'."
        ),
    ],
    target_id: Annotated[
        int,
        Form(
            description=(
                "ID del recurso al que se le asocia la imagen.\n\n"
                "- Si target='perfil' → id del usuario.\n"
                "- Si target='cancha' → id de la cancha.\n"
                "- Si target='complejo' → id del complejo."
            )
        ),
    ],
    es_principal: Annotated[
        bool,
        Form(
            description=(
                "Indica si esta imagen será marcada como principal.\n\n"
                "Puedes subir varias imágenes y luego cambiar cuál es principal "
                "usando el endpoint POST /media/{id_media}/principal."
            )
        ),
    ] = False,
    orden: Annotated[
        int,
        Form(
            description=(
                "Orden de la imagen dentro del conjunto de imágenes del mismo recurso.\n"
                "Se usa para galerías: 0, 1, 2, ..."
            )
        ),
    ] = 0,
    file: UploadFile = File(
        ...,
        description=(
            "Archivo de imagen a subir. Tipos soportados: JPEG, PNG, WEBP.\n\n"
            "En Swagger, selecciona 'file' y carga la imagen."
        ),
    ),
    db: Session = Depends(get_db),
    user: Usuario = Depends(
        require_roles("usuario", "dueno", "admin", "superadmin")
    ),
):
    """
    Crea un registro en `medios` y sube el archivo a R2.

    Retorna el `id_media` (int) para poder usarlo después
    en marcar como principal, reemplazar imagen o eliminar.
    """
    t = _norm_target(target)
    return upload_media(
        db,
        target=t,
        target_id=target_id,
        file=file,
        es_principal=es_principal,
        orden=orden,
        user=user,
    )


# ---------------------------------------------------------------------------
#  GET /media
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=MediaListOut,
    summary="Listar imágenes por target y recurso",
    description="""
Devuelve todas las imágenes asociadas a un target y un ID específico.

Este endpoint **es público** (no requiere autenticación en este router), por lo que puede ser usado
en el frontend para mostrar imágenes tanto en la web como en la app móvil.

**Parámetros:**
- `target`: 'perfil', 'cancha' o 'complejo'.
- `target_id`: ID del recurso (usuario, cancha o complejo).

**Uso típico en el frontend:**
1. Llamar: `GET /media?target=cancha&target_id=4`
2. Recorrer `items` y buscar:
   - `es_principal == true` para mostrar la imagen destacada.
   - O usar todas las imágenes como galería.

**Ejemplos:**
- Fotos de una cancha:
  - `GET /media?target=cancha&target_id=ID_CANCHA`
- Fotos del perfil de un usuario:
  - `GET /media?target=perfil&target_id=ID_USUARIO`
- Fotos de un complejo:
  - `GET /media?target=complejo&target_id=ID_COMPLEJO`
""",
)
def get_media(
    target: Annotated[
        str,
        Query(
            description="Target del recurso: 'perfil', 'cancha' o 'complejo'.",
            examples=["perfil", "cancha", "complejo"],
        ),
    ],
    target_id: Annotated[
        int,
        Query(
            description=(
                "ID del recurso:\n"
                "- usuario (perfil)\n"
                "- cancha\n"
                "- complejo"
            )
        ),
    ],
    db: Session = Depends(get_db),
):
    """
    Lista todas las imágenes asociadas a un recurso (perfil, cancha o complejo).
    """
    t = _norm_target(target)
    items = list_media(db, target=t, target_id=target_id)
    return {"items": items}


# ---------------------------------------------------------------------------
#  POST /media/{id_media}/principal
# ---------------------------------------------------------------------------

@router.post(
    "/{id_media}/principal",
    response_model=SetPrincipalOut,
    summary="Marcar una imagen como principal",
    description="""
Marca una imagen específica como **principal** para un recurso (perfil, cancha o complejo).

Internamente:
- Pone `es_principal = false` a todas las otras imágenes del mismo target y target_id.
- Pone `es_principal = true` a la imagen indicada.

**Permisos:**
- `superadmin` → puede cambiar la principal de cualquier recurso.
- `admin` / `dueno` → solo sobre sus complejos/canchas.
- `usuario` → solo sobre su propio perfil.

**Parámetros:**
- `id_media` (en la ruta): ID de la imagen que quieres marcar como principal.
- `target`: 'perfil', 'cancha' o 'complejo'.
- `target_id`: id del recurso dueño de esa imagen.

**Ejemplo de uso:**
- Cambiar la foto principal de una cancha:
  - `POST /media/10/principal?target=cancha&target_id=4`
""",
)
def mark_principal(
    id_media: Annotated[
        int,
        Path(
            description="ID de la imagen (medios.id_media) que se quiere marcar como principal."
        ),
    ],
    target: Annotated[
        str,
        Query(
            description="Target de la imagen: 'perfil', 'cancha' o 'complejo'.",
        ),
    ],
    target_id: Annotated[
        int,
        Query(
            description=(
                "ID del recurso al que debe pertenecer la imagen.\n"
                "Se valida que la imagen realmente corresponda a ese perfil/cancha/complejo."
            )
        ),
    ],
    db: Session = Depends(get_db),
    user: Usuario = Depends(
        require_roles("usuario", "dueno", "admin", "superadmin")
    ),
):
    """
    Cambia la imagen principal para el recurso indicado.
    """
    t = _norm_target(target)
    set_principal(
        db,
        target=t,
        target_id=target_id,
        id_media=id_media,
        user=user,
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
#  DELETE /media/{id_media}
# ---------------------------------------------------------------------------

@router.delete(
    "/{id_media}",
    response_model=SetPrincipalOut,
    summary="Eliminar una imagen (R2 + BD)",
    description="""
Elimina una imagen tanto de Cloudflare R2 como de la base de datos.

**Permisos:**
- `superadmin` → puede borrar cualquier imagen.
- `admin` / `dueno` → pueden borrar imágenes solo de sus complejos/canchas.
- `usuario` → solo puede borrar imágenes de su propio perfil.

**Notas:**
- Si la imagen no existe, devuelve 404.
- Si el usuario no tiene permisos sobre el recurso al que pertenece la imagen, devuelve 403.
""",
)
def delete_media_endpoint(
    id_media: Annotated[
        int,
        Path(description="ID de la imagen a eliminar (medios.id_media)."),
    ],
    db: Session = Depends(get_db),
    user: Usuario = Depends(
        require_roles("usuario", "dueno", "admin", "superadmin")
    ),
):
    """
    Borra el archivo en R2 (si existe) y elimina el registro en `medios`.
    """
    ok = delete_media(db, id_media=id_media, user=user)
    if not ok:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return {"ok": True}


# ---------------------------------------------------------------------------
#  POST /media/reorder
# ---------------------------------------------------------------------------

@router.post(
    "/reorder",
    response_model=SetPrincipalOut,
    summary="Reordenar imágenes de un recurso",
    description="""
Reordena varias imágenes del **mismo recurso** (perfil, cancha o complejo) de una sola vez.

**Body (JSON):**
Lista de objetos con:
- `id_media`: ID de la imagen.
- `orden`: nuevo valor de orden (int).

Ejemplo de body:
```json
[
  { "id_media": 10, "orden": 0 },
  { "id_media": 11, "orden": 1 },
  { "id_media": 12, "orden": 2 }
]
"""
)
def reorder_media_endpoint(
    target: str,
    target_id: int,
    body: List[ReorderIn],
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
):
    t = _norm_target(target)
    pairs = [(item.id_media, item.orden) for item in body]
    bulk_reorder(
        db,
        target=t,
        target_id=target_id,
        pairs=pairs,
        user=user,
    )
    return {"ok": True}


# ---------- Reemplazar archivo de una imagen (cambiar foto) ----------

@router.put(
    "/{id_media}",
    response_model=MediaOut,
    summary="Reemplaza el archivo de una imagen existente",
)
def replace_media_endpoint(
    id_media: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles("usuario", "dueno", "admin", "superadmin")),
):
    updated = replace_media_file(
        db,
        id_media=id_media,
        file=file,
        user=user,
    )
    return updated
