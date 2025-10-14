from sqlalchemy.orm import Session
from sqlalchemy import text

def create(db: Session, data: dict) -> int:
    q = text("""
        INSERT INTO horarios_atencion (id_complejo,id_cancha,dia,hora_apertura,hora_cierre)
        VALUES (:id_complejo,:id_cancha,:dia,:hora_apertura,:hora_cierre)
        RETURNING id_horario
    """)
    return db.execute(q, data).scalar_one()

def patch(db: Session, id_horario: int, fields: dict) -> bool:
    sets = ", ".join([f"{k} = :{k}" for k in fields.keys()])
    q = text(f"UPDATE horarios_atencion SET {sets} WHERE id_horario = :id RETURNING id_horario")
    return db.execute(q, {**fields, "id": id_horario}).one_or_none() is not None

def delete(db: Session, id_horario: int) -> bool:
    q = text("DELETE FROM horarios_atencion WHERE id_horario = :id RETURNING id_horario")
    return db.execute(q, {"id": id_horario}).one_or_none() is not None
