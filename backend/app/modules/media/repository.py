# app/modules/media/repository.py
from typing import Optional, Sequence
from sqlalchemy.orm import Session
from sqlalchemy import Table, MetaData, select, update, delete
from sqlalchemy.engine import Engine
from app.modules.media.schemas import MediaTarget

# Cache de tablas por Engine (soporta múltiples conexiones)
_METADATA = MetaData()
_MEDIOS_BY_ENGINE: dict[int, Table] = {}

def _table(db: Session) -> Table:
    eng: Engine = db.get_bind()  # SQLAlchemy 2.x
    key = id(eng)
    tbl = _MEDIOS_BY_ENGINE.get(key)
    if tbl is None:
        tbl = Table("medios", _METADATA, autoload_with=eng)
        _MEDIOS_BY_ENGINE[key] = tbl
    return tbl

class MediaRepository:
    def __init__(self, db: Session):
        self.db = db
        self.t = _table(db)

    # --------- CRUD ----------
    def get_by_id(self, id_media: int) -> Optional[dict]:
        res = self.db.execute(
            select(self.t).where(self.t.c.id_media == id_media)
        ).mappings().first()
        return dict(res) if res else None

    def insert_media(
        self, *, target: MediaTarget, target_id: int, bucket: str, object_key: str,
        url_publica: Optional[str], es_principal: bool, orden: int,
        metadata_json: Optional[dict] = None,
    ) -> int:
        row = {
            "target": target,
            "id_complejo": target_id if target == "complejo" else None,
            "id_cancha":   target_id if target == "cancha"   else None,
            "id_usuario":  target_id if target == "perfil"   else None,
            "bucket": bucket,
            "object_key": object_key,
            "url_publica": url_publica,
            "es_principal": es_principal,
            "orden": orden,
            "metadata": metadata_json,
        }
        res = self.db.execute(
            self.t.insert().values(**row).returning(self.t.c.id_media)
        )
        new_id = res.scalar_one()
        self.db.commit()
        return new_id

    def list_by_target(self, target: MediaTarget, target_id: int) -> Sequence[dict]:
        cond = {
            "complejo": self.t.c.id_complejo == target_id,
            "cancha":   self.t.c.id_cancha   == target_id,
            "perfil":   self.t.c.id_usuario  == target_id,
        }[target]
        res = self.db.execute(
            select(self.t)
            .where(self.t.c.target == target)
            .where(cond)
            .order_by(self.t.c.orden, self.t.c.id_media)
        )
        return [dict(r._mapping) for r in res.fetchall()]

    def delete_media(self, id_media: int) -> int:
        res = self.db.execute(
            delete(self.t)
            .where(self.t.c.id_media == id_media)
            .returning(self.t.c.id_media)
        )
        self.db.commit()
        return res.scalar() or 0

    def set_principal(self, target: MediaTarget, target_id: int, id_media: int) -> None:
        cond = {
            "complejo": self.t.c.id_complejo == target_id,
            "cancha":   self.t.c.id_cancha   == target_id,
            "perfil":   self.t.c.id_usuario  == target_id,
        }[target]
        # apaga todos
        self.db.execute(
            update(self.t)
            .where(self.t.c.target == target)
            .where(cond)
            .values(es_principal=False)
        )
        # prende el elegido
        self.db.execute(
            update(self.t)
            .where(self.t.c.id_media == id_media)
            .values(es_principal=True)
        )
        self.db.commit()

    def bulk_reorder(self, pairs: list[tuple[int, int]]) -> None:
        for id_media, orden in pairs:
            self.db.execute(
                update(self.t)
                .where(self.t.c.id_media == id_media)
                .values(orden=orden)
            )
        self.db.commit()
