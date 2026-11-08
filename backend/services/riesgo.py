# ---------------------------------------------------------------------------
# Umbrales de riesgo
# ---------------------------------------------------------------------------
# area_relativa = fraccion del frame que ocupa el bounding box (0.0 a 1.0).
# tasa_expansion = cambio del area relativa por segundo (positivo = acercandose).
#
# Los umbrales son valores iniciales: hay que validarlos con los videos de
# ciclovia y con la velocidad real de la bicicleta.

# Zona central horizontal del frame (trayectoria probable del usuario)
ZONA_CENTRAL_MIN = 0.25
ZONA_CENTRAL_MAX = 0.75

# Riesgo por tamano (proximidad en un solo frame)
AREA_ALTO = 0.15
AREA_MEDIO = 0.06          # vehiculos (carro, moto, bus, camion)
AREA_BAJO = 0.02

# Usuarios vulnerables (persona, bicicleta): una caja alta y estrecha ocupa
# poca area aun estando cerca, por eso el umbral de "medio" es menor.
# Valor ajustado con un solo caso (monopatinista a ~6 m en test2, area ~0.008):
# provisional hasta validar con videos de ciclovia.
CLASES_VULNERABLES = ("persona", "bicicleta")
AREA_MEDIO_VULNERABLE = 0.008

# Riesgo por acercamiento rapido: un objeto pequeno pero que crece rapido
# en la zona central tambien es peligroso.
AREA_MIN_ACERCAMIENTO_ALTO = 0.04
AREA_MIN_ACERCAMIENTO_MEDIO = 0.02
TASA_ACERCAMIENTO_ALTO = 0.10
TASA_ACERCAMIENTO_MEDIO = 0.04

_ORDEN = {"ninguno": 0, "bajo": 1, "medio": 2, "alto": 3}


def _riesgo_objeto(obj: dict) -> str:
    area = obj["area_relativa"]
    pos_x = obj["posicion_relativa"]["x"]
    tasa = obj.get("tasa_expansion", 0.0) or 0.0

    area_medio = AREA_MEDIO_VULNERABLE if obj.get("clase") in CLASES_VULNERABLES else AREA_MEDIO
    en_zona_central = ZONA_CENTRAL_MIN <= pos_x <= ZONA_CENTRAL_MAX

    if en_zona_central:
        if area > AREA_ALTO:
            return "alto"
        if area >= AREA_MIN_ACERCAMIENTO_ALTO and tasa >= TASA_ACERCAMIENTO_ALTO:
            return "alto"
        if area > area_medio:
            return "medio"
        if area >= AREA_MIN_ACERCAMIENTO_MEDIO and tasa >= TASA_ACERCAMIENTO_MEDIO:
            return "medio"

    if area > AREA_BAJO:
        return "bajo"

    return "ninguno"


def calcular_riesgo(objetos: list, ancho_frame: int, alto_frame: int) -> str:
    """
    Analiza las detecciones y determina el nivel de riesgo del frame.
    No usa IA: es logica algoritmica pura.

    Criterios (se toma el nivel mas alto entre todos los objetos):
    - ALTO:  objeto grande (>15% del frame) y centrado horizontalmente,
             o objeto mediano en zona central que se acerca rapido.
    - MEDIO: objeto de tamano moderado en zona central (umbral menor para
             personas y bicicletas), o pequeno en zona central que se acerca.
    - BAJO:  objetos en los bordes o pequenos.
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
