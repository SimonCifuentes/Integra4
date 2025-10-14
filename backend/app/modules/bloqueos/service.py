from fastapi import HTTPException
from sqlalchemy.orm import Session
from .repository import create as repo_create, delete as repo_delete

def crear(db: Session, body: dict) -> int:
    if body["inicio"] >= body["fin"]:
        raise HTTPException(422, "inicio debe ser < fin")
    return repo_create(db, body)

def eliminar(db: Session, id_bloqueo: int) -> None:
    if not repo_delete(db, id_bloqueo):
        raise HTTPException(404, "Bloqueo no encontrado")
