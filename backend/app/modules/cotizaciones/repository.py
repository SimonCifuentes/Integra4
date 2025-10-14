from typing import List, Optional
from sqlalchemy.orm import Session
from .model import Cotizacion, CotizacionItem
from .schemas import CotizacionCreateIn, CotizacionUpdateIn, CotItemIn

def create_cotizacion(db: Session, data: CotizacionCreateIn) -> Cotizacion:
    cot = Cotizacion(
        nombre=data.nombre,
        cliente=data.cliente,
        moneda=data.moneda,
        notas=data.notas,
        paquetes_meta=data.paquetes_meta or {},
    )
    db.add(cot)
    db.flush()  # para obtener cot.id

    # agregar items
    for it in data.items:
        _add_item(db, cot, it)

    _recalc_totals(db, cot)
    db.commit()
    db.refresh(cot)
    return cot

def get_cotizacion(db: Session, cot_id: int) -> Optional[Cotizacion]:
    return db.query(Cotizacion).filter(Cotizacion.id == cot_id).first()

def list_cotizaciones(db: Session, q: Optional[str] = None, limit: int = 50, offset: int = 0) -> List[Cotizacion]:
    query = db.query(Cotizacion)
    if q:
        like = f"%{q}%"
        query = query.filter(Cotizacion.nombre.ilike(like))
    return query.order_by(Cotizacion.created_at.desc()).offset(offset).limit(limit).all()

def update_cotizacion(db: Session, cot: Cotizacion, data: CotizacionUpdateIn) -> Cotizacion:
    if data.nombre is not None: cot.nombre = data.nombre
    if data.cliente is not None: cot.cliente = data.cliente
    if data.moneda is not None: cot.moneda = data.moneda
    if data.notas is not None: cot.notas = data.notas
    if data.paquetes_meta is not None: cot.paquetes_meta = data.paquetes_meta

    if data.items is not None:
        # reemplazo total del detalle
        db.query(CotizacionItem).filter(CotizacionItem.cotizacion_id == cot.id).delete()
        db.flush()
        for it in data.items:
            _add_item(db, cot, it)

    _recalc_totals(db, cot)
    db.commit()
    db.refresh(cot)
    return cot

def delete_cotizacion(db: Session, cot: Cotizacion) -> None:
    db.delete(cot)
    db.commit()

# ------- helpers -------

def _add_item(db: Session, cot: Cotizacion, it: CotItemIn) -> CotizacionItem:
    subtotal = round(it.horas * it.tarifa_hora, 2)
    item = CotizacionItem(
        cotizacion_id=cot.id,
        paquete=it.paquete,
        rol=it.rol,
        horas=it.horas,
        tarifa_hora=it.tarifa_hora,
        subtotal=subtotal,
        descripcion=it.descripcion,
    )
    db.add(item)
    return item

def _recalc_totals(db: Session, cot: Cotizacion) -> None:
    items = db.query(CotizacionItem).filter(CotizacionItem.cotizacion_id == cot.id).all()
    cot.total_horas = round(sum(i.horas for i in items), 2)
    cot.total_monto = round(sum(i.subtotal for i in items), 0)
