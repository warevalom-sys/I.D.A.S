import cv2
import numpy as np
import threading
from datetime import datetime
from ultralytics import YOLO
from services.riesgo import calcular_riesgo

# Cargar modelo una sola vez al iniciar (no en cada request)
# YOLOv8n = versión nano, la más ligera. Cambia a yolov8s.pt para más precisión.
modelo = YOLO("yolov8n.pt")  # Se descarga automáticamente la primera vez

# Clases que nos interesan (índices del modelo COCO)
CLASES_RELEVANTES = {
    0: "persona",
    1: "bicicleta",
    2: "carro",
    3: "moto",
    5: "bus",
    7: "camion",
}

# Cache en memoria: por sesión, guarda el último estado conocido de cada objeto rastreado
# Estructura: { sesion_id: { track_id: {"area": float, "timestamp": datetime} } }
historial_tracking = {}

# ─────────────────────────────────────────────────────────────────
# Protección de concurrencia sobre el modelo compartido
# ─────────────────────────────────────────────────────────────────
# modelo.track(..., persist=True) mantiene el estado interno de ByteTrack
# en la propia instancia del modelo, NO separado por sesión. Si dos
# sesiones distintas mandan frames casi al mismo tiempo, el tracker puede
# intentar correlacionar objetos de escenas completamente distintas.
#
# Esta mitigación:
#   1) Serializa el acceso a modelo.track() con un Lock, evitando que dos
#      threads lo llamen exactamente al mismo tiempo (FastAPI puede correr
#      requests concurrentes en threads).
#   2) Resetea el tracker interno cuando detecta que la sesión activa
#      cambió desde la última llamada, para no arrastrar estado de una
#      sesión anterior hacia la nueva.
#
# No es un aislamiento perfecto entre sesiones simultáneas activas al
# mismo tiempo (para eso se necesitaría un tracker por sesión), pero
# cubre el caso más común: alternar entre sesiones sin que termine
# limpiamente la anterior.
_lock_modelo = threading.Lock()
_ultima_sesion_procesada = None


def _resetear_tracker_si_cambio_sesion(sesion_id: int):
    """Si la sesión activa cambió desde la última llamada, resetea el
    estado interno del tracker de ByteTrack para no mezclar IDs entre
    sesiones distintas. Debe llamarse ya dentro del lock."""
    global _ultima_sesion_procesada

    if _ultima_sesion_procesada is not None and _ultima_sesion_procesada != sesion_id:
        if modelo.predictor is not None and hasattr(modelo.predictor, "trackers"):
            for tracker in modelo.predictor.trackers:
                tracker.reset()

    _ultima_sesion_procesada = sesion_id


def procesar_frame(imagen_bytes: bytes, sesion_id: int) -> dict:
    """
    Recibe bytes de imagen, corre YOLOv8 con tracking y devuelve
    detecciones estructuradas, incluyendo tasa de expansión por objeto
    (proxy de velocidad relativa) usando el historial de la sesión.
    """
    np_array = np.frombuffer(imagen_bytes, np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if frame is None:
        return {
            "estado": "error",
            "mensaje": "No se pudo decodificar la imagen",
            "objetos_detectados": [],
            "nivel_riesgo": "desconocido"
        }

    alto, ancho = frame.shape[:2]
    ahora = datetime.utcnow()

    # .track() en vez de la llamada normal: asigna un ID persistente por objeto.
    # Todo el acceso al modelo compartido queda serializado por el lock.
    with _lock_modelo:
        _resetear_tracker_si_cambio_sesion(sesion_id)
        resultados = modelo.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False)[0]

    cache_sesion = historial_tracking.setdefault(sesion_id, {})
    objetos = []

    for box in resultados.boxes:
        clase_id = int(box.cls[0])

        # Filtrar solo clases relevantes
        if clase_id not in CLASES_RELEVANTES:
            continue

        confianza = float(box.conf[0])
        if confianza < 0.4:  # Ignorar detecciones poco confiables
            continue

        # Coordenadas del bounding box
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        bbox_ancho = x2 - x1
        bbox_alto = y2 - y1

        # Posición relativa al centro de la imagen
        centro_x = (x1 + x2) / 2
        centro_y = (y1 + y2) / 2
        pos_rel_x = centro_x / ancho  # 0.0 = izquierda, 1.0 = derecha
        pos_rel_y = centro_y / alto   # 0.0 = arriba, 1.0 = abajo

        area_relativa = round((bbox_ancho * bbox_alto) / (ancho * alto), 4)

        # ID de tracking (puede venir None en los primeros frames antes de confirmarse)
        track_id = int(box.id[0]) if box.id is not None else None

        # Tasa de expansión: cuánto creció el área por segundo respecto al frame anterior
        # con el mismo track_id. Positivo = acercándose, negativo = alejándose.
        tasa_expansion = 0.0
        if track_id is not None and track_id in cache_sesion:
            estado_previo = cache_sesion[track_id]
            delta_t = (ahora - estado_previo["timestamp"]).total_seconds()
            if delta_t > 0:
                tasa_expansion = round((area_relativa - estado_previo["area"]) / delta_t, 4)

        if track_id is not None:
            cache_sesion[track_id] = {"area": area_relativa, "timestamp": ahora}

        objetos.append({
            "clase": CLASES_RELEVANTES[clase_id],
            "confianza": round(confianza, 2),
            "bbox": {
                "x": x1, "y": y1,
                "ancho": bbox_ancho, "alto": bbox_alto
            },
            "posicion_relativa": {
                "x": round(pos_rel_x, 3),
                "y": round(pos_rel_y, 3)
            },
            "area_relativa": area_relativa,
            "track_id": track_id,
            "tasa_expansion": tasa_expansion,
        })

    nivel_riesgo = calcular_riesgo(objetos, ancho, alto)

    return {
        "estado": "ok",
        "objetos_detectados": objetos,
        "total_objetos": len(objetos),
        "nivel_riesgo": nivel_riesgo,
        "resolucion_frame": {"ancho": ancho, "alto": alto}
    }


def limpiar_tracking_sesion(sesion_id: int):
    """Llamar al finalizar una sesión, para no acumular memoria indefinidamente."""
    historial_tracking.pop(sesion_id, None)