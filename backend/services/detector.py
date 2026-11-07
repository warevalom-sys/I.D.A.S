import os
import time
import threading
from collections import deque, OrderedDict

import cv2
import numpy as np
from ultralytics import YOLO

from services.riesgo import calcular_riesgo

RUTA_MODELO = "yolov8n.pt"  # nano = la más ligera. Cambia a yolov8s.pt para más precisión.

# Se carga uno al iniciar para descargar los pesos la primera vez y fallar
# temprano si algo está mal. La primera sesión usa esta instancia.
_modelo_precargado = YOLO(RUTA_MODELO)

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
# Estructura: { sesion_id: { track_id: {"area": float, "timestamp": float (monotonic)} } }
historial_tracking = {}

# Mínimo de segundos entre dos observaciones del mismo objeto para calcular
# la tasa de expansión. Con intervalos muy pequeños el ruido del bounding box
# se amplifica y la tasa se dispara sin que el objeto se haya movido.
DELTA_T_MINIMO = 0.1

# ─────────────────────────────────────────────────────────────────
# Aislamiento entre sesiones (uso simultáneo desde varios dispositivos)
# ─────────────────────────────────────────────────────────────────
# modelo.track(..., persist=True) guarda el estado de ByteTrack dentro de la
# propia instancia del modelo. Si todas las sesiones compartieran una sola
# instancia, los IDs de objetos de un dispositivo se mezclarían con los del
# otro. Por eso cada sesión tiene su PROPIA instancia de YOLO (con su propio
# tracker) y su propio candado, que mantiene en orden los frames de esa sesión.
#
# Límites para no gastar memoria:
#   - MAX_SESIONES_ACTIVAS: si se supera, se descarta la sesión menos usada.
#   - INACTIVIDAD_MAX_S: se descarta una sesión sin frames en ese tiempo
#     (por ejemplo, si el usuario cerró la pestaña sin finalizar).
# Si una sesión descartada vuelve a enviar frames, se le crea un modelo nuevo
# y el tracking empieza de cero (se pierde solo la continuidad de IDs).
# Se puede cambiar sin tocar el código, p. ej. para pruebas de carga:
#   PowerShell:  $env:IDSS_MAX_SESIONES = 10; uvicorn app:app --port 8000
MAX_SESIONES_ACTIVAS = int(os.environ.get("IDSS_MAX_SESIONES", "4"))
INACTIVIDAD_MAX_S = 300

_registro_lock = threading.Lock()
# { sesion_id: {"modelo": YOLO, "lock": Lock, "ultimo_uso": float} }
_sesiones = OrderedDict()


def _descartar_sesion(sesion_id: int):
    """Debe llamarse con _registro_lock tomado."""
    _sesiones.pop(sesion_id, None)
    historial_tracking.pop(sesion_id, None)


def _obtener_contexto(sesion_id: int) -> dict:
    """Devuelve (creándolo si hace falta) el modelo y el candado de la sesión."""
    global _modelo_precargado
    ahora = time.monotonic()

    with _registro_lock:
        # Descartar sesiones abandonadas
        for sid in [s for s, c in _sesiones.items()
                    if s != sesion_id and ahora - c["ultimo_uso"] > INACTIVIDAD_MAX_S]:
            _descartar_sesion(sid)

        contexto = _sesiones.get(sesion_id)
        if contexto is None:
            # Hacer espacio descartando la sesión menos usada
            while len(_sesiones) >= MAX_SESIONES_ACTIVAS:
                _descartar_sesion(next(iter(_sesiones)))

            if _modelo_precargado is not None:
                modelo, _modelo_precargado = _modelo_precargado, None
            else:
                modelo = YOLO(RUTA_MODELO)

            contexto = {"modelo": modelo, "lock": threading.Lock(), "ultimo_uso": ahora}
            _sesiones[sesion_id] = contexto

        contexto["ultimo_uso"] = ahora
        _sesiones.move_to_end(sesion_id)
        return contexto


# ─────────────────────────────────────────────────────────────────
# Métricas de latencia (para la validación de KPIs)
# ─────────────────────────────────────────────────────────────────
# Se guardan en memoria las últimas 500 mediciones; no se persisten en BD.
UMBRAL_LATENCIA_MS = 500  # objetivo definido en la gestión de riesgos (R3)
_latencias = deque(maxlen=500)  # tuplas (total_ms, inferencia_ms)
# Tiempo que la ruta pasa guardando en la base de datos y tiempo total dentro
# de la ruta (leer la imagen + inferencia + base de datos). El tiempo de
# inferencia NO incluye la base de datos: con un disco lento, SQLite puede
# tardar mucho más que YOLO sin que se note en "latencia_inferencia_ms".
_latencias_bd = deque(maxlen=500)  # tuplas (bd_ms, ruta_ms)


def registrar_latencia_bd(bd_ms: float, ruta_ms: float):
    _latencias_bd.append((bd_ms, ruta_ms))


def _percentil(valores_ordenados: list, p: float) -> float:
    indice = int(round(p * (len(valores_ordenados) - 1)))
    return valores_ordenados[indice]


def _metricas_inferencia() -> dict:
    """Resumen de latencia de los últimos frames procesados."""
    muestras = list(_latencias)
    if not muestras:
        return {"frames_medidos": 0, "sesiones_activas": len(_sesiones)}

    totales = sorted(m[0] for m in muestras)
    inferencias = sorted(m[1] for m in muestras)
    n = len(totales)
    promedio = sum(totales) / n

    return {
        "frames_medidos": n,
        "sesiones_activas": len(_sesiones),
        "latencia_total_ms": {
            "promedio": round(promedio, 1),
            "mediana": round(_percentil(totales, 0.5), 1),
            "p95": round(_percentil(totales, 0.95), 1),
            "maximo": round(totales[-1], 1),
        },
        "latencia_inferencia_ms": {
            "promedio": round(sum(inferencias) / n, 1),
            "p95": round(_percentil(inferencias, 0.95), 1),
        },
        "fps_maximo_teorico": round(1000 / promedio, 2) if promedio > 0 else None,
        "umbral_ms": UMBRAL_LATENCIA_MS,
        "porcentaje_bajo_umbral": round(
            100 * sum(1 for t in totales if t <= UMBRAL_LATENCIA_MS) / n, 1
        ),
    }


def _resumen(valores_ordenados: list) -> dict:
    n = len(valores_ordenados)
    return {
        "promedio": round(sum(valores_ordenados) / n, 1),
        "p95": round(_percentil(valores_ordenados, 0.95), 1),
        "maximo": round(valores_ordenados[-1], 1),
    }


def _metricas_bd() -> dict:
    muestras = list(_latencias_bd)
    if not muestras:
        return {}
    return {
        "latencia_bd_ms": _resumen(sorted(m[0] for m in muestras)),
        "latencia_ruta_ms": _resumen(sorted(m[1] for m in muestras)),
    }


def obtener_metricas() -> dict:
    """Latencia de inferencia + base de datos + ruta completa (últimos 500 frames)."""
    return {**_metricas_inferencia(), **_metricas_bd()}


def reiniciar_metricas():
    _latencias.clear()
    _latencias_bd.clear()


def procesar_frame(imagen_bytes: bytes, sesion_id: int) -> dict:
    """
    Recibe bytes de imagen, corre YOLOv8 con tracking y devuelve
    detecciones estructuradas, incluyendo tasa de expansión por objeto
    (proxy de velocidad relativa) usando el historial de la sesión.
    """
    inicio_total = time.perf_counter()

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
    ahora = time.monotonic()

    contexto = _obtener_contexto(sesion_id)
    objetos = []

    # Todo lo que toca el modelo y el historial de ESTA sesión va bajo su
    # candado: los frames de una misma sesión se procesan en orden, y las
    # demás sesiones usan sus propios modelos.
    with contexto["lock"]:
        # .track() en vez de la llamada normal: asigna un ID persistente por objeto.
        inicio_inferencia = time.perf_counter()
        resultados = contexto["modelo"].track(
            frame, persist=True, tracker="bytetrack.yaml", verbose=False
        )[0]
        inferencia_ms = (time.perf_counter() - inicio_inferencia) * 1000

        cache_sesion = historial_tracking.setdefault(sesion_id, {})

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

            # Tasa de expansión: cuánto creció el área por segundo respecto a la
            # observación anterior con el mismo track_id.
            # Positivo = acercándose, negativo = alejándose.
            tasa_expansion = 0.0
            if track_id is not None:
                estado_previo = cache_sesion.get(track_id)
                if estado_previo is None:
                    cache_sesion[track_id] = {"area": area_relativa, "timestamp": ahora}
                else:
                    delta_t = ahora - estado_previo["timestamp"]
                    # Si llegó demasiado pronto no se actualiza la referencia:
                    # así el siguiente cálculo compara contra una observación más antigua.
                    if delta_t >= DELTA_T_MINIMO:
                        tasa_expansion = round((area_relativa - estado_previo["area"]) / delta_t, 4)
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

    total_ms = (time.perf_counter() - inicio_total) * 1000
    _latencias.append((total_ms, inferencia_ms))

    return {
        "estado": "ok",
        "objetos_detectados": objetos,
        "total_objetos": len(objetos),
        "nivel_riesgo": nivel_riesgo,
        "resolucion_frame": {"ancho": ancho, "alto": alto},
        "tiempo_procesamiento_ms": round(total_ms, 1),
        "tiempo_inferencia_ms": round(inferencia_ms, 1),
    }


def limpiar_tracking_sesion(sesion_id: int):
    """Llamar al finalizar una sesión: libera su modelo y su historial de tracking."""
    with _registro_lock:
        _descartar_sesion(sesion_id)