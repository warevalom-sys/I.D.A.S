import cv2
import numpy as np
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

def procesar_frame(imagen_bytes: bytes) -> dict:
    """
    Recibe bytes de imagen, corre YOLOv8 y devuelve detecciones estructuradas.
    """
    # Convertir bytes a imagen OpenCV
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

    # Correr inferencia con YOLOv8
    resultados = modelo(frame, verbose=False)[0]

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
            "area_relativa": round((bbox_ancho * bbox_alto) / (ancho * alto), 4)
        })

    nivel_riesgo = calcular_riesgo(objetos, ancho, alto)

    return {
        "estado": "ok",
        "objetos_detectados": objetos,
        "total_objetos": len(objetos),
        "nivel_riesgo": nivel_riesgo,
        "resolucion_frame": {"ancho": ancho, "alto": alto}
    }