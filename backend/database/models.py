from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database.database import Base


class SesionAnalisis(Base):
    __tablename__ = "sesiones_analisis"

    id = Column(Integer, primary_key=True, index=True)
    fecha_inicio = Column(DateTime, default=datetime.utcnow)
    estado = Column(String, default="activa")

    # RELACIONES
    frames = relationship("FrameAnalizado", back_populates="sesion")
    detecciones = relationship("RegistroDeteccion", back_populates="sesion")


class RegistroDeteccion(Base):
    __tablename__ = "registros_deteccion"

    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones_analisis.id"))
    fecha = Column(DateTime, default=datetime.utcnow)

    clase_objeto = Column(String)
    confianza = Column(Float)
    area_relativa = Column(Float)
    nivel_riesgo = Column(String)

    # RELACION
    sesion = relationship("SesionAnalisis", back_populates="detecciones")


class FrameAnalizado(Base):
    __tablename__ = "frames_analizados"

    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones_analisis.id"))
    timestamp_frame = Column(DateTime, default=datetime.utcnow)

    ancho = Column(Integer)
    alto = Column(Integer)

    nivel_riesgo = Column(String)
    total_objetos = Column(Integer)

    # RELACIONES
    sesion = relationship("SesionAnalisis", back_populates="frames")
    objetos = relationship("ObjetoDetectado", back_populates="frame")


class ObjetoDetectado(Base):
    __tablename__ = "objetos_detectados"

    id = Column(Integer, primary_key=True, index=True)
    frame_id = Column(Integer, ForeignKey("frames_analizados.id"))

    clase = Column(String)
    confianza = Column(Float)

    bbox_x = Column(Integer)
    bbox_y = Column(Integer)
    bbox_ancho = Column(Integer)
    bbox_alto = Column(Integer)

    pos_rel_x = Column(Float)
    pos_rel_y = Column(Float)

    area_relativa = Column(Float)

    # RELACION
    frame = relationship("FrameAnalizado", back_populates="objetos")