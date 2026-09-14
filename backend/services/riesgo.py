def calcular_riesgo(objetos: list, ancho_frame: int, alto_frame: int) -> str:
    """
    Analiza las detecciones y determina el nivel de riesgo.
    No usa IA — es lógica algorítmica pura.

    Criterios:
    - ALTO:  objeto grande (>15% del frame) y centrado horizontalmente
    - MEDIO: objeto de tamaño moderado en zona central
    - BAJO:  objetos en los bordes o pequeños
    - NINGUNO: sin detecciones relevantes
    """
    if not objetos:
        return "ninguno"

    riesgo_maximo = "ninguno"

    for obj in objetos:
        area = obj["area_relativa"]
        pos_x = obj["posicion_relativa"]["x"]

        # ¿El objeto está cerca del centro horizontal? (entre 25% y 75%)
        en_zona_central = 0.25 <= pos_x <= 0.75

        if area > 0.15 and en_zona_central:
            # Objeto grande y centrado → riesgo alto
            return "alto"

        elif area > 0.06 and en_zona_central:
            riesgo_maximo = "medio"

        elif area > 0.02 and riesgo_maximo == "ninguno":
            riesgo_maximo = "bajo"

    return riesgo_maximo

# Cache en memoria: por sesión, guarda el último estado conocido de cada objeto rastreado
# Estructura: { sesion_id: { track_id: {"area": float, "timestamp": datetime} } }
historial_tracking = {}

def procesar_frame(imagen_bytes: bytes, sesion_id: int) -> dict:
    np_array = np.frombuffer(imagen_bytes, np.uint8)
    frame = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

    if frame is None:
        return {"estado": "error", "mensaje": "No se pudo decodificar la imagen",
                "objetos_detectados": [], "nivel_riesgo": "desconocido"}

    alto, ancho = frame.shape[:2]
    ahora = datetime.utcnow()

    # .track() en vez de la llamada normal: asigna un ID persistente por objeto
    resultados = modelo.track(frame, persist=True, tracker="bytetrack.yaml", verbose=False)[0]

    cache_sesion = historial_tracking.setdefault(sesion_id, {})
    objetos = []

    for box in resultados.boxes:
        clase_id = int(box.cls[0])
        if clase_id not in CLASES_RELEVANTES:
            continue

        confianza = float(box.conf[0])
        if confianza < 0.4:
            continue

        x1, y1, x2, y2 = map(int, box.xyxy[0])
        bbox_ancho, bbox_alto = x2 - x1, y2 - y1
        centro_x, centro_y = (x1 + x2) / 2, (y1 + y2) / 2
        area_relativa = round((bbox_ancho * bbox_alto) / (ancho * alto), 4)

        # ID de tracking (puede venir None en los primeros frames antes de confirmarse)
        track_id = int(box.id[0]) if box.id is not None else None

        # Tasa de expansión: cuánto creció el área por segundo respecto al frame anterior
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
            "bbox": {"x": x1, "y": y1, "ancho": bbox_ancho, "alto": bbox_alto},
            "posicion_relativa": {"x": round(centro_x / ancho, 3), "y": round(centro_y / alto, 3)},
            "area_relativa": area_relativa,
            "tasa_expansion": tasa_expansion,  # positivo = acercándose, negativo = alejándose
        })

    nivel_riesgo = calcular_riesgo(objetos, ancho, alto)

    return {"estado": "ok", "objetos_detectados": objetos, "total_objetos": len(objetos),
            "nivel_riesgo": nivel_riesgo, "resolucion_frame": {"ancho": ancho, "alto": alto}}


def limpiar_tracking_sesion(sesion_id: int):
    """Llamar al finalizar una sesión, para no acumular memoria indefinidamente."""
    historial_tracking.pop(sesion_id, None)
