from fastapi import HTTPException
from sqlalchemy.orm import Session
from .repository import create as repo_create, patch as repo_patch, delete as repo_delete

def crear(db: Session, body: dict) -> int:
    if body["hora_apertura"] >= body["hora_cierre"]:
        raise HTTPException(422, "hora_apertura debe ser < hora_cierre")
    return repo_create(db, body)

def actualizar_parcial(db: Session, id_horario: int, fields: dict) -> None:
    if not fields: return
    if "hora_apertura" in fields and "hora_cierre" in fields:
        if fields["hora_apertura"] >= fields["hora_cierre"]:
            raise HTTPException(422, "hora_apertura debe ser < hora_cierre")
    if not repo_patch(db, id_horario, fields):
        raise HTTPException(404, "Horario no encontrado")

def eliminar(db: Session, id_horario: int) -> None:
    if not repo_delete(db, id_horario):
        raise HTTPException(404, "Horario no encontrado")
