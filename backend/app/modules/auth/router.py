from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.shared.deps import get_db, get_current_user
from app.modules.auth.schemas import UserCreate, UserLogin, TokenOut, UserPublic, UserUpdate
from app.modules.auth.service import register as svc_register, login as svc_login, me as svc_me, update_me as svc_update_me
from app.modules.auth.model import Usuario

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenOut, status_code=201)
def register_endpoint(payload: UserCreate, db: Session = Depends(get_db)):
    return svc_register(db, payload)

@router.post("/login", response_model=TokenOut)
def login_endpoint(payload: UserLogin, db: Session = Depends(get_db)):
    return svc_login(db, payload)

@router.get("/me", response_model=UserPublic)
def me_endpoint(current: Usuario = Depends(get_current_user)):
    return svc_me(current)

@router.patch("/me", response_model=UserPublic)
def update_me_endpoint(
    payload: UserUpdate,
    current: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return svc_update_me(db, current, payload)
