from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.security import decode_token
from app.db.session import SessionLocal  # usa tu SessionLocal existente
from app.modules.auth.model import Usuario
security = HTTPBearer(auto_error=True)  # <-- añade esto

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _set_rls_user(db: Session, user_id: Optional[int]):
    # Tu schema usa app.current_user_id para RLS en ciertas tablas
    if user_id:
        db.execute(text("SET LOCAL app.current_user_id = :uid"), {"uid": user_id})

def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),  # <-- usa bearer
    db: Session = Depends(get_db),
) -> Usuario:
    token = creds.credentials  # ya viene sin el prefijo 'Bearer'
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.get(Usuario, int(sub))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    _set_rls_user(db, user.id_usuario)
    return user

def require_roles(*roles_db_values: str):
    def _wrapper(user: Usuario = Depends(get_current_user)) -> Usuario:
        if user.rol not in roles_db_values:
            raise HTTPException(status_code=403, detail="Insufficient role")
        return user
    return _wrapper
