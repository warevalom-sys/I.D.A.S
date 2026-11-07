# ─────────────────────────────────────────────────────────────────
# Umbrales de riesgo
# ─────────────────────────────────────────────────────────────────
# area_relativa = fracción del frame que ocupa el bounding box (0.0 a 1.0).
# tasa_expansion = cambio del área relativa por segundo (positivo = acercándose).
#
# Los umbrales de TASA son valores iniciales: hay que calibrarlos con los
# videos de prueba (Sprint 7) y con la velocidad real de la bicicleta.

# Zona central horizontal del frame (trayectoria probable del usuario)
ZONA_CENTRAL_MIN = 0.25
ZONA_CENTRAL_MAX = 0.75

# Riesgo por tamaño (proximidad en un solo frame)
AREA_ALTO = 0.15
AREA_MEDIO = 0.06
AREA_BAJO = 0.02

# Riesgo por acercamiento rápido: un objeto pequeño pero que crece rápido
# en la zona central también es peligroso.
AREA_MIN_ACERCAMIENTO_ALTO = 0.04
AREA_MIN_ACERCAMIENTO_MEDIO = 0.02
TASA_ACERCAMIENTO_ALTO = 0.10
TASA_ACERCAMIENTO_MEDIO = 0.04

_ORDEN = {"ninguno": 0, "bajo": 1, "medio": 2, "alto": 3}


def _riesgo_objeto(obj: dict) -> str:
    area = obj["area_relativa"]
    pos_x = obj["posicion_relativa"]["x"]
    tasa = obj.get("tasa_expansion", 0.0) or 0.0

    en_zona_central = ZONA_CENTRAL_MIN <= pos_x <= ZONA_CENTRAL_MAX

    if en_zona_central:
        if area > AREA_ALTO:
            return "alto"
        if area >= AREA_MIN_ACERCAMIENTO_ALTO and tasa >= TASA_ACERCAMIENTO_ALTO:
            return "alto"
        if area > AREA_MEDIO:
            return "medio"
        if area >= AREA_MIN_ACERCAMIENTO_MEDIO and tasa >= TASA_ACERCAMIENTO_MEDIO:
            return "medio"

    if area > AREA_BAJO:
        return "bajo"

    return "ninguno"


def calcular_riesgo(objetos: list, ancho_frame: int, alto_frame: int) -> str:
    """
    Analiza las detecciones y determina el nivel de riesgo del frame.
    No usa IA — es lógica algorítmica pura.

    Criterios (se toma el nivel más alto entre todos los objetos):
    - ALTO:  objeto grande (>15% del frame) y centrado horizontalmente,
             o objeto mediano en zona central que se acerca rápido.
    - MEDIO: objeto de tamaño moderado en zona central,
             o objeto pequeño en zona central que se acerca.
    - BAJO:  objetos en los bordes o pequeños.
    - NINGUNO: sin detecciones relevantes.
    """
    if not objetos:
        return "ninguno"

    riesgo_maximo = "ninguno"
    for obj in objetos:
        nivel = _riesgo_objeto(obj)
        if _ORDEN[nivel] > _ORDEN[riesgo_maximo]:
            riesgo_maximo = nivel
            if riesgo_maximo == "alto":
                break

    return riesgo_maximo