"""
Autotest de services/alerta.py con secuencias sinteticas (cadencia 0.75 s).
Uso (desde backend/, con el venv activo):  python pruebas\prueba_alerta.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from services.alerta import evaluar, limpiar_sesion  # noqa: E402

PASO = 0.75


def frame(nivel, tasa=0.0):
    return {"nivel_riesgo": nivel, "objetos_detectados": [{"tasa_expansion": tasa}]}


def correr(sid, secuencia):
    t, salida = 0.0, []
    for nivel, tasa in secuencia:
        salida.append(evaluar(sid, frame(nivel, tasa), ahora=t))
        t += PASO
    return salida


def comprobar(nombre, obtenido, esperado):
    ok = obtenido == esperado
    print(f"[{'OK' if ok else 'FALLA'}] {nombre}: obtenido={obtenido} esperado={esperado}")
    return ok


resultados = []

# 1) Semaforo (tipo E03): 12 frames alto con tasa 0 -> solo 3 pitidos
s = correr(1, [("alto", 0.0)] * 12)
resultados.append(comprobar("semaforo: pitidos", sum(s), 3))
resultados.append(comprobar("semaforo: primeros 3 suenan", s[:3], [True] * 3))

# 2) Acercamiento confirmado tras el silencio: 1 pico no basta, 2 de 3 si
s = correr(2, [("alto", 0.0)] * 6 + [("alto", 0.1), ("alto", 0.1)])
resultados.append(comprobar("pico aislado no suena, segundo pico si", s[6:], [False, True]))

# 3) Rearme: 5 frames alto, 5 fuera (3.75 s), y vuelve a sonar al entrar en alto
s = correr(3, [("alto", 0.0)] * 5 + [("ninguno", 0.0)] * 5 + [("alto", 0.0)] * 2)
resultados.append(comprobar("rearme tras 3 s fuera de alto", s[-2:], [True, True]))

# 4) Sin rearme si solo baja 1 frame (0.75 s): sigue silenciado
s = correr(4, [("alto", 0.0)] * 5 + [("medio", 0.0)] + [("alto", 0.0)] * 3)
resultados.append(comprobar("bajada corta no rearma", s[-3:], [False, False, False]))

# 5) Sesiones aisladas
correr(5, [("alto", 0.0)] * 5)
resultados.append(comprobar("otra sesion arranca limpia", correr(6, [("alto", 0.0)])[0], True))

for sid in range(1, 7):
    limpiar_sesion(sid)

print("\nTODO OK" if all(resultados) else "\nHAY FALLAS")
