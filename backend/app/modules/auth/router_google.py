from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.shared.deps import get_db
from app.modules.auth.service_google import google_login
from app.modules.auth.schemas_google import GoogleAuthPayload

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/google/login", summary="Login/Registro con Google")
def google_login_endpoint(payload: GoogleAuthPayload, db: Session = Depends(get_db)):
    return google_login(db, payload)
