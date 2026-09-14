from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)

    # Nullable porque un usuario autenticado por Google/Microsoft/etc.
    # nunca tiene contraseña propia en nuestro sistema.
    password_hash = Column(String, nullable=True)

    # "local" = email/password propio; "google", "microsoft", etc. = OAuth futuro
    proveedor_auth = Column(String, default="local", nullable=False)
    # ID que el proveedor externo asigna a ese usuario (el "sub" de un token OAuth).
    # Nulo para usuarios "local". Junto con proveedor_auth identifica de forma
    # única a un usuario autenticado externamente.
    proveedor_id = Column(String, nullable=True, index=True)

    rol = Column(String, default="conductor")            # "conductor" | "admin"
    modo_preferido = Column(String, default="ciclista")   # "ciclista" | "carro"
    tiene_auto = Column(Boolean, default=False)           # decide si se muestra Perfil del Vehículo en Settings

    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # RELACIONES
    sesiones = relationship("SesionAnalisis", back_populates="usuario")
    vehiculo = relationship("Vehiculo", back_populates="usuario", uselist=False)


class SesionAnalisis(Base):
    __tablename__ = "sesiones_analisis"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    vehiculo_id = Column(Integer, ForeignKey("vehiculos.id"), nullable=True)

    fecha_inicio = Column(DateTime, default=datetime.utcnow)
    fecha_fin = Column(DateTime, nullable=True)
    estado = Column(String, default="activa")

    # El video NUNCA se sube al backend — se queda en el dispositivo.
    # Estos campos son solo referencia/metadata para que la propia app
    # sepa que existe y dónde reproducirlo localmente.
    tiene_video = Column(Boolean, default=False)
    video_local_uri = Column(String, nullable=True)

    # RELACIONES
    usuario = relationship("Usuario", back_populates="sesiones")
    vehiculo = relationship("Vehiculo")
    frames = relationship("FrameAnalizado", back_populates="sesion")
    detecciones = relationship("RegistroDeteccion", back_populates="sesion")


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
    detecciones = relationship("RegistroDeteccion", back_populates="frame")


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

    # Tracking entre frames (YOLO ByteTrack) — permite calcular velocidad relativa.
    # Puede ser None en los primeros frames antes de que el tracker confirme el ID,
    # o si el objeto nunca se rastrea de forma continua.
    track_id = Column(Integer, nullable=True, index=True)

    # Tasa de expansión del área relativa por segundo, respecto al frame anterior
    # con el mismo track_id. Positivo = acercándose, negativo = alejándose, 0 = sin
    # referencia previa (primer frame del objeto) o velocidad relativa estable.
    tasa_expansion = Column(Float, default=0.0)

    # RELACION
    frame = relationship("FrameAnalizado", back_populates="objetos")


class RegistroDeteccion(Base):
    """
    Log de ALERTAS reales — solo se crea una fila cuando el nivel de riesgo
    del frame es medio o alto (no en cada frame procesado). Para saber qué
    objeto específico disparó la alerta, se consulta ObjetoDetectado a
    través de frame_id — no se duplican esos campos aquí.
    """
    __tablename__ = "registros_deteccion"

    id = Column(Integer, primary_key=True, index=True)
    sesion_id = Column(Integer, ForeignKey("sesiones_analisis.id"))
    frame_id = Column(Integer, ForeignKey("frames_analizados.id"))
    fecha = Column(DateTime, default=datetime.utcnow)

    nivel_riesgo = Column(String)  # "medio" | "alto"
    descripcion = Column(String)   # ej. "Vehículo a 1.5m detectado"

    # RELACIONES
    sesion = relationship("SesionAnalisis", back_populates="detecciones")
    frame = relationship("FrameAnalizado", back_populates="detecciones")


class Vehiculo(Base):
    """
    Perfil del vehículo del usuario — relación 1:1 con Usuario.
    Solo tiene sentido crearlo cuando Usuario.tiene_auto es True;
    la app usa ese flag para decidir si muestra la sección
    "Vehículo" en Settings.
    """
    __tablename__ = "vehiculos"

    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)

    tipo = Column(String, default="carro")   # "carro" | "moto" | "camioneta", etc.
    marca = Column(String, nullable=True)
    modelo = Column(String, nullable=True)
    anio = Column(Integer, nullable=True)
    placa = Column(String, nullable=True)
    color = Column(String, nullable=True)

    fecha_creacion = Column(DateTime, default=datetime.utcnow)

    # RELACION (1:1)
    usuario = relationship("Usuario", back_populates="vehiculo")