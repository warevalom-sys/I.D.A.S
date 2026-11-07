"""
Politica de alerta sonora por sesion.

Decide, frame a frame, si el frontend debe pitar. No cambia el nivel de riesgo:
solo agrega el campo 'alerta_sonora' a la respuesta.

Reglas (aprobadas):
1. Al entrar en 'alto' suenan PITIDOS_INICIALES frames y luego se silencia.
2. Si sigue en 'alto', solo vuelve a sonar con acercamiento confirmado:
   tasa >= TASA_ACERCAMIENTO en al menos CONFIRMAR de los ultimos VENTANA frames.
3. Se rearma tras REARME_S segundos seguidos fuera de 'alto'.

Limitacion: usa la tasa maxima de todos los objetos del frame, no la del objeto
que causa el riesgo.
"""
import threading
import time
from collections import deque

PITIDOS_INICIALES = 3
TASA_ACERCAMIENTO = 0.04
CONFIRMAR = 2
VENTANA = 3
REARME_S = 3.0

# { sesion_id: {"pitidos": int, "acerca": deque[bool], "fuera_desde": float | None} }
_estados = {}
_lock = threading.Lock()


def _estado_nuevo() -> dict:
    return {"pitidos": 0, "acerca": deque(maxlen=VENTANA), "fuera_desde": None}


def evaluar(sesion_id: int, resultado: dict, ahora: float = None) -> bool:
    """Devuelve True si el frontend debe pitar con este frame."""
    ahora = time.monotonic() if ahora is None else ahora
    objetos = resultado.get("objetos_detectados") or []
    tasa_max = max((o.get("tasa_expansion") or 0.0 for o in objetos), default=0.0)
    es_alto = resultado.get("nivel_riesgo") == "alto"

    with _lock:
        est = _estados.setdefault(sesion_id, _estado_nuevo())
        est["acerca"].append(tasa_max >= TASA_ACERCAMIENTO)

        if not es_alto:
            if est["fuera_desde"] is None:
                est["fuera_desde"] = ahora
            if ahora - est["fuera_desde"] >= REARME_S:
                est["pitidos"] = 0
            return False

        est["fuera_desde"] = None
        if est["pitidos"] < PITIDOS_INICIALES:
            est["pitidos"] += 1
            return True
        return sum(est["acerca"]) >= CONFIRMAR


def limpiar_sesion(sesion_id: int) -> None:
    with _lock:
        _estados.pop(sesion_id, None)
