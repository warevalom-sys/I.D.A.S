from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class ObjetoDetectadoSchema(BaseModel):
    clase: str
    confianza: float
    bbox_x: int
    bbox_y: int
    bbox_ancho: int
    bbox_alto: int
    pos_rel_x: float
    pos_rel_y: float
    area_relativa: float

class FrameAnalizadoSchema(BaseModel):
    sesion_id: str  # En MongoDB los IDs suelen ser cadenas (ObjectId o strings)
    timestamp_frame: datetime = Field(default_factory=datetime.utcnow)
    ancho: int
    alto: int
    nivel_riesgo: str
    total_objetos: int
    objetos: List[ObjetoDetectadoSchema] = []

class SesionAnalisisSchema(BaseModel):
    fecha_inicio: datetime = Field(default_factory=datetime.utcnow)
    estado: str = "activa"