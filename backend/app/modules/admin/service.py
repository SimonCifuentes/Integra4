# app/modules/admin/service.py
from sqlalchemy.orm import Session
from app.modules.admin import repository as repo   # <— IMPORT ABSOLUTO

class AdminService:
    @staticmethod
    def complejos_por_dueno(db: Session, *, user_id: int):
        return repo.select_complejos_de_dueno(db, user_id=user_id)
