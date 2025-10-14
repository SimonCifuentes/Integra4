from __future__ import annotations
from typing import List, Optional
from pydantic import BaseModel, Field

class CotItemIn(BaseModel):
    paquete: str = Field(..., min_length=1)
    rol: str = Field(..., min_length=1)
    horas: float = Field(..., ge=0)
    tarifa_hora: float = Field(..., ge=0)
    descripcion: Optional[str] = None

class CotizacionCreateIn(BaseModel):
    nombre: str
    cliente: Optional[str] = None
    moneda: str = "CLP"
    notas: Optional[str] = None
    paquetes_meta: Optional[dict] = None
    items: List[CotItemIn]

class CotItemOut(BaseModel):
    id: int
    paquete: str
    rol: str
    horas: float
    tarifa_hora: float
    subtotal: float
    descripcion: Optional[str]

    class Config:
        from_attributes = True

class CotizacionOut(BaseModel):
    id: int
    nombre: str
    cliente: Optional[str]
    moneda: str
    notas: Optional[str]
    total_horas: float
    total_monto: float
    paquetes_meta: Optional[dict]
    items: List[CotItemOut]

    class Config:
        from_attributes = True

class CotizacionUpdateIn(BaseModel):
    nombre: Optional[str] = None
    cliente: Optional[str] = None
    moneda: Optional[str] = None
    notas: Optional[str] = None
    paquetes_meta: Optional[dict] = None
    items: Optional[List[CotItemIn]] = None  # si se envía, reemplaza todo el detalle
