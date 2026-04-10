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
