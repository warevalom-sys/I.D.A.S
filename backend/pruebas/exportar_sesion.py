"""
Exporta a CSV una sesión que ya está guardada en la base de datos.
(Autocontenido: no depende de probar_video.py.)

Sirve cuando el análisis se hizo desde la APLICACIÓN (por ejemplo, subiendo un
video en modo vehicular) y no con probar_video.py. Todo lo que analiza la app
queda en la base de datos; este script lo lee por la API y lo convierte en un
CSV y un resumen, listos para compartir o para el informe.

Uso (con el servidor encendido):
    python pruebas/exportar_sesion.py                 # la sesión más reciente con frames
    python pruebas/exportar_sesion.py --listar        # ver las últimas sesiones
    python pruebas/exportar_sesion.py --sesion 7      # una sesión concreta
    python pruebas/exportar_sesion.py --sesion 7 --etiquetas videos/ciclovia.csv

Notas:
  - El tiempo (columna "segundo") se cuenta desde el PRIMER frame que recibió
    el servidor, no desde el inicio del video. Si quieres comparar con
    etiquetas, escribe los segundos de las etiquetas con esa misma referencia.
  - La latencia por frame no se guarda en la base de datos. El resumen incluye
    la latencia de /api/metricas, que solo existe si el servidor NO se ha
    reiniciado desde la prueba (se guarda en memoria, últimos 500 frames).
"""
import argparse
import csv
import json
import sys
import urllib.request
from collections import Counter
from datetime import datetime

NIVELES = ["ninguno", "bajo", "medio", "alto"]
ALERTA = {"medio", "alto"}


# ───────────────────────────── Etiquetas ─────────────────────────────
def cargar_etiquetas(ruta):
    filas = []
    with open(ruta, newline="", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            nivel = fila["riesgo_esperado"].strip().lower()
            if nivel not in NIVELES:
                sys.exit(f"Nivel inválido en etiquetas: '{nivel}' (usa {NIVELES})")
            filas.append((float(fila["segundo"]), nivel))
    filas.sort()
    if not filas:
        sys.exit("El archivo de etiquetas está vacío")
    return filas


def nivel_esperado(etiquetas, segundo):
    esperado = etiquetas[0][1]
    for inicio, nivel in etiquetas:
        if segundo >= inicio:
            esperado = nivel
        else:
            break
    return esperado


def resumen_precision(filas):
    n = len(filas)
    aciertos = sum(1 for f in filas if f["riesgo_esperado"] == f["nivel_riesgo"])
    print(f"\nPrecisión del nivel de riesgo: {aciertos}/{n} = {100*aciertos/n:.1f}%")

    print("\nMatriz de confusión (filas = esperado, columnas = detectado):")
    print(" " * 10 + "".join(f"{c:>9}" for c in NIVELES))
    for esp in NIVELES:
        cuenta = Counter(f["nivel_riesgo"] for f in filas if f["riesgo_esperado"] == esp)
        print(f"{esp:>10}" + "".join(f"{cuenta.get(c, 0):>9}" for c in NIVELES))

    # Métrica de seguridad: ¿se avisó cuando había que avisar?
    tp = sum(1 for f in filas if f["riesgo_esperado"] in ALERTA and f["nivel_riesgo"] in ALERTA)
    fn = sum(1 for f in filas if f["riesgo_esperado"] in ALERTA and f["nivel_riesgo"] not in ALERTA)
    fp = sum(1 for f in filas if f["riesgo_esperado"] not in ALERTA and f["nivel_riesgo"] in ALERTA)
    prec = tp / (tp + fp) if tp + fp else float("nan")
    rec = tp / (tp + fn) if tp + fn else float("nan")
    print("\nAlertas (riesgo medio o alto):")
    print(f"  Aciertos={tp}  Alertas perdidas={fn}  Falsas alarmas={fp}")
    print(f"  Precisión={prec:.2f}  Sensibilidad={rec:.2f}")


def _get(url):
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read())


def _fecha(texto):
    return datetime.fromisoformat(texto)


def frames_de(url, sesion_id):
    frames = _get(f"{url}/api/sesiones/{sesion_id}/frames")
    return sorted(frames, key=lambda f: f["timestamp_frame"])


def main():
    ap = argparse.ArgumentParser(description="Exporta una sesión guardada a CSV.")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--sesion", type=int, help="ID de la sesión (por defecto, la más reciente con frames)")
    ap.add_argument("--listar", action="store_true", help="Solo mostrar las últimas sesiones")
    ap.add_argument("--etiquetas", help="CSV con riesgo esperado por segundo")
    ap.add_argument("--salida", help="CSV de salida (por defecto sesion_<id>.csv)")
    args = ap.parse_args()

    try:
        sesiones = _get(f"{args.url}/api/sesiones")
    except Exception as e:
        sys.exit(f"No se pudo conectar al backend en {args.url}: {e}")
    if not sesiones:
        sys.exit("No hay sesiones guardadas todavía.")

    if args.listar:
        print(f"{'ID':>5}  {'Inicio (UTC)':<20} {'Estado':<11} {'Frames':>7}")
        for s in sesiones[:15]:
            n = len(_get(f"{args.url}/api/sesiones/{s['id']}/frames"))
            print(f"{s['id']:>5}  {s['fecha_inicio'][:19]:<20} {s['estado']:<11} {n:>7}")
        return

    sesion_id = args.sesion
    if sesion_id is None:
        for s in sesiones:  # ya vienen de la más reciente a la más antigua
            if frames_de(args.url, s["id"]):
                sesion_id = s["id"]
                break
        if sesion_id is None:
            sys.exit("Ninguna sesión tiene frames analizados.")
        print(f"Usando la sesión más reciente con frames: {sesion_id}")

    frames = frames_de(args.url, sesion_id)
    if not frames:
        sys.exit(f"La sesión {sesion_id} no tiene frames analizados.")
    alertas = _get(f"{args.url}/api/sesiones/{sesion_id}/alertas")
    etiquetas = cargar_etiquetas(args.etiquetas) if args.etiquetas else None

    t0 = _fecha(frames[0]["timestamp_frame"])
    filas = []
    for f in frames:
        seg = (_fecha(f["timestamp_frame"]) - t0).total_seconds()
        fila = {
            "segundo": round(seg, 2),
            "nivel_riesgo": f["nivel_riesgo"],
            "total_objetos": f["total_objetos"],
            "ancho": f["ancho"],
            "alto": f["alto"],
        }
        if etiquetas:
            fila["riesgo_esperado"] = nivel_esperado(etiquetas, seg)
        filas.append(fila)

    salida = args.salida or f"sesion_{sesion_id}.csv"
    with open(salida, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    duracion = filas[-1]["segundo"]
    intervalos = [b["segundo"] - a["segundo"] for a, b in zip(filas, filas[1:])]
    print("\n" + "=" * 60)
    print(f"Sesión {sesion_id}: {len(filas)} frames en {duracion:.1f} s")
    if intervalos:
        prom = sum(intervalos) / len(intervalos)
        print(f"Intervalo promedio entre frames: {prom*1000:.0f} ms "
              f"({1/prom:.2f} fps efectivos)" if prom > 0 else "")
    print("Resolución de los frames:", f"{filas[0]['ancho']}x{filas[0]['alto']}")
    print("Distribución de riesgo:", dict(Counter(f["nivel_riesgo"] for f in filas)))
    print(f"Alertas registradas (riesgo medio/alto): {len(alertas)}")
    try:
        m = _get(f"{args.url}/api/metricas")
        print("Métricas de latencia del servidor:", json.dumps(m, ensure_ascii=False))
    except Exception:
        pass

    if etiquetas:
        resumen_precision(filas)
    print(f"\nCSV guardado en: {salida}")


if __name__ == "__main__":
    main()