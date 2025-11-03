# app/modules/auth/utils.py
from datetime import datetime, timedelta, timezone
from jose import jwt

# Puedes mover esto a app/core/config si ya tienes settings central
SECRET_KEY = "CHANGE_ME_SUPER_SECRET"          # ← pon tu secreto desde env/config
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24          # 24h

def create_access_token(subject: int | str, expires_delta: timedelta | None = None) -> str:
    """
    Genera un JWT simple con 'sub' = id_usuario (o email), firmado con SECRET_KEY.
    """
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
