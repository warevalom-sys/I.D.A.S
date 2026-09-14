from database.database import SessionLocal
from database.models import SesionAnalisis, FrameAnalizado, ObjetoDetectado, RegistroDeteccion, Usuario, Vehiculo
from datetime import datetime


def crear_sesion(usuario_id: int = None, vehiculo_id: int = None):
    db = SessionLocal()
    nueva_sesion = SesionAnalisis(usuario_id=usuario_id, vehiculo_id=vehiculo_id)
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


def _descripcion_alerta(objetos_detectados: list) -> str:
    """Genera una descripción corta de la alerta a partir del objeto
    con mayor área relativa (el más cercano/prominente en el frame)."""
    if not objetos_detectados:
        return "Riesgo detectado en el entorno"
    objeto_principal = max(objetos_detectados, key=lambda o: o["area_relativa"])
    return f"{objeto_principal['clase']} detectado — posible riesgo de colisión"


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
                area_relativa=obj["area_relativa"],
                track_id=obj.get("track_id"),
                tasa_expansion=obj.get("tasa_expansion", 0.0),
            )
            db.add(deteccion)

        # RegistroDeteccion: solo se crea cuando el riesgo del frame
        # es medio o alto — no en cada frame procesado.
        if resultado["nivel_riesgo"] in ("medio", "alto"):
            alerta = RegistroDeteccion(
                sesion_id=sesion_id,
                frame_id=frame.id,
                nivel_riesgo=resultado["nivel_riesgo"],
                descripcion=_descripcion_alerta(resultado["objetos_detectados"]),
            )
            db.add(alerta)

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


def obtener_alertas_de_sesion(sesion_id: int):
    """Historial de alertas reales (riesgo medio/alto) de una sesión —
    pensado para el futuro módulo de Análisis."""
    db = SessionLocal()
    alertas = db.query(RegistroDeteccion).filter(
        RegistroDeteccion.sesion_id == sesion_id
    ).order_by(RegistroDeteccion.fecha.desc()).all()
    db.close()
    return [
        {
            "id": a.id,
            "frame_id": a.frame_id,
            "fecha": a.fecha.isoformat() if a.fecha else None,
            "nivel_riesgo": a.nivel_riesgo,
            "descripcion": a.descripcion,
        }
        for a in alertas
    ]


def finalizar_sesion(sesion_id: int):
    db = SessionLocal()
    sesion = db.query(SesionAnalisis).filter(SesionAnalisis.id == sesion_id).first()
    if not sesion:
        db.close()
        return None

    sesion.estado = "finalizada"
    sesion.fecha_fin = datetime.utcnow()
    db.commit()
    db.refresh(sesion)
    db.close()
    return sesion


def actualizar_video_sesion(sesion_id: int, video_local_uri: str):
    db = SessionLocal()
    sesion = db.query(SesionAnalisis).filter(SesionAnalisis.id == sesion_id).first()
    if not sesion:
        db.close()
        return None

    sesion.tiene_video = True
    sesion.video_local_uri = video_local_uri
    db.commit()
    db.refresh(sesion)
    db.close()
    return sesion


def crear_usuario(nombre: str, email: str, password_hash: str = None,
                   proveedor_auth: str = "local", proveedor_id: str = None,
                   tiene_auto: bool = False, modo_preferido: str = "ciclista"):
    db = SessionLocal()
    try:
        nuevo_usuario = Usuario(
            nombre=nombre,
            email=email,
            password_hash=password_hash,
            proveedor_auth=proveedor_auth,
            proveedor_id=proveedor_id,
            tiene_auto=tiene_auto,
            modo_preferido=modo_preferido,
        )
        db.add(nuevo_usuario)
        db.commit()
        db.refresh(nuevo_usuario)
        return nuevo_usuario
    finally:
        db.close()


def obtener_usuario_por_email(email: str):
    db = SessionLocal()
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    db.close()
    return usuario


def obtener_usuario_por_proveedor(proveedor_auth: str, proveedor_id: str):
    """Búsqueda para login externo (Google/Microsoft/etc.) — identifica
    al usuario por proveedor + su ID en ese proveedor, no por password."""
    db = SessionLocal()
    usuario = db.query(Usuario).filter(
        Usuario.proveedor_auth == proveedor_auth,
        Usuario.proveedor_id == proveedor_id,
    ).first()
    db.close()
    return usuario


def crear_vehiculo(usuario_id: int, tipo: str, marca: str = None, modelo: str = None,
                    anio: int = None, placa: str = None, color: str = None):
    db = SessionLocal()
    try:
        vehiculo = Vehiculo(
            usuario_id=usuario_id,
            tipo=tipo,
            marca=marca,
            modelo=modelo,
            anio=anio,
            placa=placa,
            color=color,
        )
        db.add(vehiculo)
        db.commit()
        db.refresh(vehiculo)
        return vehiculo
    finally:
        db.close()