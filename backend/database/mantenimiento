"""
Mantenimiento de sesiones.

Si el cliente se cierra sin llamar a "finalizar" (pestaña cerrada, celular sin
batería, servidor reiniciado), la sesión queda como "activa" para siempre.
Este módulo las cierra:
  - al arrancar el servidor: todas las "activas" son de una ejecución anterior,
    porque el seguimiento de objetos vive en memoria y se perdió al reiniciar;
  - al crear una sesión nueva: las que llevan más de N minutos sin recibir frames.
"""
from datetime import datetime, timedelta

from sqlalchemy import func

from database.database import SessionLocal
from database.models import SesionAnalisis, FrameAnalizado


def cerrar_sesiones_abandonadas(minutos: int = 30, al_arrancar: bool = False) -> int:
    """Marca como finalizadas las sesiones abandonadas. Devuelve cuántas cerró.

    La fecha de fin que se guarda es la del último frame recibido (o la de
    inicio si nunca llegó ninguno), no la hora en que se hizo la limpieza.
    """
    db = SessionLocal()
    try:
        limite = datetime.utcnow() - timedelta(minutes=minutos)
        cerradas = 0
        for sesion in db.query(SesionAnalisis).filter(SesionAnalisis.estado == "activa").all():
            ultimo_frame = (
                db.query(func.max(FrameAnalizado.timestamp_frame))
                .filter(FrameAnalizado.sesion_id == sesion.id)
                .scalar()
            )
            referencia = ultimo_frame or sesion.fecha_inicio
            if al_arrancar or (referencia is not None and referencia < limite):
                sesion.estado = "finalizada"
                sesion.fecha_fin = referencia or datetime.utcnow()
                cerradas += 1
        if cerradas:
            db.commit()
        return cerradas
    finally:
        db.close()