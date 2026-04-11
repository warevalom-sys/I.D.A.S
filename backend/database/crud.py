from database.connection import SessionLocal
from database.models import SesionAnalisis, FrameAnalizado, ObjetoDetectado


def crear_sesion():
    db = SessionLocal()
    nueva_sesion = SesionAnalisis()
    db.add(nueva_sesion)
    db.commit()
    db.refresh(nueva_sesion)
    db.close()
    return nueva_sesion.id


def obtener_sesion_por_id(sesion_id: int):
    db = SessionLocal()
    sesion = db.query(SesionAnalisis).filter(
        SesionAnalisis.id == sesion_id
    ).first()
    db.close()
    return sesion


def guardar_frame(sesion_id: int, resultado: dict):
    db = SessionLocal()
    try:
        frame = FrameAnalizado(
            sesion_id=sesion_id,
            ancho=resultado["resolucion_frame"]["ancho"],
            alto=resultado["resolucion_frame"]["alto"],
            nivel_riesgo=resultado["nivel_riesgo"],
            total_objetos=resultado["total_objetos"]
        )
        db.add(frame)
        db.flush()

        for obj in resultado["objetos_detectados"]:
            deteccion = ObjetoDetectado(
                frame_id=frame.id,
                clase=obj["clase"],
                confianza=obj["confianza"],
                bbox_x=obj["bbox"]["x"],
                bbox_y=obj["bbox"]["y"],
                bbox_ancho=obj["bbox"]["ancho"],
                bbox_alto=obj["bbox"]["alto"],
                pos_rel_x=obj["posicion_relativa"]["x"],
                pos_rel_y=obj["posicion_relativa"]["y"],
                area_relativa=obj["area_relativa"]
            )
            db.add(deteccion)

        db.commit()

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


def obtener_todas_sesiones():
    db = SessionLocal()
    sesiones = db.query(SesionAnalisis).order_by(
        SesionAnalisis.fecha_inicio.desc()
    ).all()
    db.close()
    return [
        {
            "id": s.id,
            "fecha_inicio": s.fecha_inicio.isoformat() if s.fecha_inicio else None,
            "estado": s.estado,
        }
        for s in sesiones
    ]


def obtener_frames_de_sesion(sesion_id: int):
    db = SessionLocal()
    frames = db.query(FrameAnalizado).filter(
        FrameAnalizado.sesion_id == sesion_id
    ).order_by(FrameAnalizado.timestamp_frame.desc()).all()
    db.close()
    return [
        {
            "id": f.id,
            "timestamp_frame": f.timestamp_frame.isoformat() if f.timestamp_frame else None,
            "ancho": f.ancho,
            "alto": f.alto,
            "nivel_riesgo": f.nivel_riesgo,
            "total_objetos": f.total_objetos,
        }
        for f in frames
    ]