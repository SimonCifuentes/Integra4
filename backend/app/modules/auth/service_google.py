from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.modules.auth.model import Usuario
from app.modules.auth.repository import AuthRepository
from app.modules.auth.schemas_google import GoogleAuthPayload

# Si tienes TokenOut/UserOut en tus schemas, impórtalos:
try:
    from app.modules.auth.schemas import TokenOut  # opcional
    _HAS_TOKEN_OUT = True
except Exception:
    _HAS_TOKEN_OUT = False

def _public_user(u: Usuario) -> dict:
    return {
        "id_usuario": u.id_usuario,
        "nombre": u.nombre,
        "apellido": u.apellido,
        "email": u.email,
        "rol": u.rol,
        "verificado": u.verificado,
        "avatar_url": u.avatar_url,
        "google_id": u.google_id,
    }

def _issue(u: Usuario):
    # MISMA función y claims que ya usan tus endpoints
    token = create_access_token(sub=u.id_usuario)
    payload = {"access_token": token, "token_type": "bearer", "user": _public_user(u)}
    return TokenOut(**payload) if _HAS_TOKEN_OUT else payload

def _maybe_update_avatar(db: Session, u: Usuario, avatar_url: Optional[str]):
    if avatar_url and u.avatar_url != avatar_url:
        u.avatar_url = avatar_url
        db.commit(); db.refresh(u)

def _link_google(db: Session, u: Usuario, google_id: str, avatar_url: Optional[str]):
    u.google_id = google_id
    if not u.verificado:
        u.verificado = True
    if avatar_url and u.avatar_url != avatar_url:
        u.avatar_url = avatar_url
    db.commit(); db.refresh(u)

def google_login(db: Session, payload: GoogleAuthPayload):
    repo = AuthRepository(db)
    try:
        # 1) Ya vinculado por google_id
        u = repo.find_by_google_id(payload.google_id)
        if u:
            _maybe_update_avatar(db, u, payload.avatar_url)
            return _issue(u)

        # 2) Existe por email -> vincular
        u = repo.find_by_email(payload.email)
        if u:
            _link_google(db, u, payload.google_id, payload.avatar_url)
            return _issue(u)

        # 3) No existe -> crear social
        u = repo.create_user_google(
            nombre=payload.nombre,
            apellido=payload.apellido,
            email=payload.email,
            google_id=payload.google_id,
            avatar_url=payload.avatar_url,
        )
        return _issue(u)

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error en Google auth: {e}")
