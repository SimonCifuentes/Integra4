from sqlalchemy.orm import Session
from sqlalchemy import text

def create(db: Session, data: dict) -> int:
    q = text("""
        INSERT INTO bloqueos (id_cancha, inicio, fin, motivo)
        VALUES (:id_cancha, :inicio, :fin, :motivo)
        RETURNING id_bloqueo
    """)
    return db.execute(q, data).scalar_one()

def delete(db: Session, id_bloqueo: int) -> bool:
    q = text("DELETE FROM bloqueos WHERE id_bloqueo = :id RETURNING id_bloqueo")
    return db.execute(q, {"id": id_bloqueo}).one_or_none() is not None
