"""
Prueba del backend con un video pregrabado (Sprints 4 y 7 + validacion de KPIs).

Lee un video, extrae un frame cada N milisegundos (igual que el frontend),
lo envia a /api/analizar-frame y guarda un CSV con el resultado de cada
frame. Al final imprime un resumen con la latencia, la distribucion de
niveles de riesgo y los pitidos que habria sonado (campo alerta_sonora).

IMPORTANTE: por defecto los frames se ENVIAN a cadencia real (uno cada
--intervalo-ms de reloj). El backend calcula la tasa de expansion con el
reloj real, asi que enviar sin pausa distorsiona la tasa y la politica de
alerta. Usa --sin-ritmo solo para medir latencia maxima.

Uso basico:
    python pruebas/probar_video.py videos/ciclovia_dia.mp4

Con etiquetas manuales (para medir la precision del nivel de riesgo):
    python pruebas/probar_video.py videos/ciclovia_dia.mp4 --etiquetas videos/ciclovia_dia.csv

Detalle por objeto de un tramo (R01 = 37 a 44 s), con 10 s de margen previo:
    python pruebas/probar_video.py test2.mp4 --desde 37 --hasta 44 ^
        --salida pruebas/r01.csv --objetos-jsonl pruebas/r01_objetos.jsonl

Formato del CSV de etiquetas (el nivel aplica desde ese segundo hasta la
siguiente fila):
    segundo,riesgo_esperado
    0,ninguno
    12.5,medio
    14,alto
    17,ninguno

Notas:
  - La URL por defecto usa 127.0.0.1 y no "localhost": en Windows, "localhost"
    se resuelve primero a IPv6 (::1) y, si el servidor solo escucha en IPv4,
    cada peticion pierde ~2 s esperando el reintento.
  - Los primeros frames enviados (--descartar-primeros, 1 por defecto) incluyen
    el arranque del modelo YOLO; se marcan en la columna "calentamiento" y no
    cuentan en las estadisticas de latencia.
  - "alerta_sonora" vale 1 si el backend indico que el frontend debe pitar
    con ese frame, 0 si no, y queda vacia si el backend no envia el campo.
  - "ms_desde_anterior" es el tiempo real entre este envio y el anterior;
    con ritmo real debe rondar --intervalo-ms.
  - Con --desde/--hasta los frames del margen se envian (para que el tracker
    y la tasa tengan historial) pero no se guardan en el CSV ni en el JSONL.
    Los IDs del tracker pueden diferir de los de la corrida completa.
  - El nivel por objeto del JSONL se calcula con services.riesgo._riesgo_objeto
    (mismas reglas del backend). El nivel del frame es el maximo de esos.

Solo usa la libreria estandar y OpenCV (ya instalado para el backend).
El servidor debe estar corriendo:  uvicorn app:app --port 8000
"""
import argparse
import csv
import json
import math
import statistics
import sys
import time
import urllib.request
import uuid
from collections import Counter
from pathlib import Path

import cv2

# Para reutilizar las reglas de riesgo del backend (nivel por objeto).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
try:
    from services.riesgo import _riesgo_objeto, ZONA_CENTRAL_MIN, ZONA_CENTRAL_MAX
except Exception as _e:  # el script sigue funcionando sin el nivel por objeto
    _riesgo_objeto = None
    ZONA_CENTRAL_MIN, ZONA_CENTRAL_MAX = 0.25, 0.75
    _ERROR_IMPORT_RIESGO = str(_e)
else:
    _ERROR_IMPORT_RIESGO = ""

NIVELES = ["ninguno", "bajo", "medio", "alto"]
ALERTA = {"medio", "alto"}


# ------------------------- HTTP (sin dependencias) -------------------------
def _json(url, metodo="GET", cuerpo=None):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        url, data=datos, method=metodo,
        headers={"Content-Type": "application/json"} if datos else {},
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def _enviar_frame(url, jpg: bytes):
    frontera = uuid.uuid4().hex
    cuerpo = (
        f"--{frontera}\r\n"
        'Content-Disposition: form-data; name="frame"; filename="frame.jpg"\r\n'
        "Content-Type: image/jpeg\r\n\r\n"
    ).encode() + jpg + f"\r\n--{frontera}--\r\n".encode()
    req = urllib.request.Request(
        url, data=cuerpo, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={frontera}"},
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


# ----------------------------- Etiquetas -----------------------------
def cargar_etiquetas(ruta):
    filas = []
    with open(ruta, newline="", encoding="utf-8") as f:
        for fila in csv.DictReader(f):
            nivel = fila["riesgo_esperado"].strip().lower()
            if nivel not in NIVELES:
                sys.exit(f"Nivel invalido en etiquetas: '{nivel}' (usa {NIVELES})")
            filas.append((float(fila["segundo"]), nivel))
    filas.sort()
    if not filas:
        sys.exit("El archivo de etiquetas esta vacio")
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
    print(f"\nPrecision del nivel de riesgo: {aciertos}/{n} = {100*aciertos/n:.1f}%")

    print("\nMatriz de confusion (filas = esperado, columnas = detectado):")
    print(" " * 10 + "".join(f"{c:>9}" for c in NIVELES))
    for esp in NIVELES:
        cuenta = Counter(f["nivel_riesgo"] for f in filas if f["riesgo_esperado"] == esp)
        print(f"{esp:>10}" + "".join(f"{cuenta.get(c, 0):>9}" for c in NIVELES))

    # Metrica de seguridad: se aviso cuando habia que avisar?
    tp = sum(1 for f in filas if f["riesgo_esperado"] in ALERTA and f["nivel_riesgo"] in ALERTA)
    fn = sum(1 for f in filas if f["riesgo_esperado"] in ALERTA and f["nivel_riesgo"] not in ALERTA)
    fp = sum(1 for f in filas if f["riesgo_esperado"] not in ALERTA and f["nivel_riesgo"] in ALERTA)
    prec = tp / (tp + fp) if tp + fp else float("nan")
    rec = tp / (tp + fn) if tp + fn else float("nan")
    print("\nAlertas (riesgo medio o alto):")
    print(f"  Aciertos={tp}  Alertas perdidas={fn}  Falsas alarmas={fp}")
    print(f"  Precision={prec:.2f}  Sensibilidad={rec:.2f}")


# ----------------------------- Estadisticas -----------------------------
def _percentil(valores, p):
    orden = sorted(valores)
    return orden[int(round(p * (len(orden) - 1)))]


def _linea_latencia(nombre, valores):
    if not valores:
        return f"{nombre}: sin datos"
    return (f"{nombre} (ms): promedio={statistics.mean(valores):.0f}  "
            f"mediana={statistics.median(valores):.0f}  "
            f"p95={_percentil(valores, 0.95):.0f}  max={max(valores):.0f}")


# ----------------------------- Detalle por objeto -----------------------------
def _objeto_detalle(o):
    x = (o.get("posicion_relativa") or {}).get("x")
    y = (o.get("posicion_relativa") or {}).get("y")
    nivel = ""
    if _riesgo_objeto is not None:
        try:
            nivel = _riesgo_objeto(o)
        except Exception:
            nivel = ""
    return {
        "clase": o.get("clase"),
        "confianza": o.get("confianza"),
        "track_id": o.get("track_id"),
        "area": o.get("area_relativa"),
        "x": x,
        "y": y,
        "en_zona_central": (ZONA_CENTRAL_MIN <= x <= ZONA_CENTRAL_MAX) if x is not None else None,
        "tasa": o.get("tasa_expansion"),
        "nivel_objeto": nivel,
    }


# ------------------------------- Principal -------------------------------
def main():
    ap = argparse.ArgumentParser(description="Prueba el backend IDSS con un video.")
    ap.add_argument("video")
    ap.add_argument("--url", default="http://127.0.0.1:8000",
                    help="URL base del backend (usa 127.0.0.1, no localhost)")
    ap.add_argument("--intervalo-ms", type=int, default=750, help="Un frame cada N ms (como el frontend)")
    ap.add_argument("--sin-ritmo", action="store_true",
                    help="Enviar sin pausas (solo para latencia maxima; distorsiona la tasa)")
    ap.add_argument("--etiquetas", help="CSV con riesgo esperado por segundo")
    ap.add_argument("--salida", help="CSV de resultados (por defecto <video>_resultados.csv)")
    ap.add_argument("--max-frames", type=int, default=0, help="Limitar frames guardados (0 = todo)")
    ap.add_argument("--descartar-primeros", type=int, default=1,
                    help="Frames de calentamiento que no cuentan en la latencia (por defecto 1)")
    ap.add_argument("--objetos-jsonl", help="Guardar el detalle por objeto de cada frame (JSONL)")
    ap.add_argument("--desde", type=float, default=0.0, help="Segundo de video donde empieza lo que se guarda")
    ap.add_argument("--hasta", type=float, default=0.0, help="Segundo de video donde termina (0 = hasta el final)")
    ap.add_argument("--margen", type=float, default=10.0,
                    help="Segundos enviados antes de --desde para calentar tracker y tasa (no se guardan)")
    args = ap.parse_args()

    if args.desde > 0 and not args.salida:
        sys.exit("Con --desde debes indicar --salida para no pisar el CSV de la corrida completa.")
    if args.objetos_jsonl and _riesgo_objeto is None:
        print(f"AVISO: no se pudo importar services.riesgo ({_ERROR_IMPORT_RIESGO}); "
              "el JSONL saldra sin 'nivel_objeto'.\n")

    if "localhost" in args.url:
        print("AVISO: 'localhost' puede anadir ~2 s por peticion en Windows (IPv6). "
              "Usa http://127.0.0.1:8000 para medir la latencia real.\n")
    if args.sin_ritmo:
        print("AVISO: --sin-ritmo activo. La tasa de expansion y alerta_sonora NO son "
              "representativas de la app real.\n")

    cap = cv2.VideoCapture(args.video)
    if not cap.isOpened():
        sys.exit(f"No se pudo abrir el video: {args.video}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duracion = total / fps if total else 0
    etiquetas = cargar_etiquetas(args.etiquetas) if args.etiquetas else None

    try:
        _json(f"{args.url}/health")
    except Exception as e:
        sys.exit(f"No se pudo conectar al backend en {args.url}: {e}")

    paso_s = args.intervalo_ms / 1000

    # Inicio alineado a la cuadricula de paso_s para coincidir con la corrida completa.
    t = 0.0
    if args.desde > 0:
        t = max(0.0, math.floor((args.desde - args.margen) / paso_s) * paso_s)

    print(f"Video: {args.video}  ({duracion:.1f} s, {fps:.1f} fps)")
    if args.desde > 0 or args.hasta > 0:
        fin_txt = f"{args.hasta:.1f}" if args.hasta > 0 else "fin"
        print(f"Tramo guardado: {args.desde:.1f} a {fin_txt} s | envio desde t={t:.2f} s (margen)")
    _json(f"{args.url}/api/metricas/reiniciar", "POST")
    sesion_id = _json(f"{args.url}/api/sesiones", "POST", {})["sesion_id"]
    modo = "sin pausas" if args.sin_ritmo else "a cadencia real"
    print(f"Sesion {sesion_id} creada. Analizando un frame cada {args.intervalo_ms} ms ({modo})...\n")

    jsonl = open(args.objetos_jsonl, "w", encoding="utf-8") if args.objetos_jsonl else None

    filas, errores = [], 0
    inicio_ritmo = time.perf_counter()
    n_envio = 0
    ultimo_envio = None
    while True:
        if args.hasta > 0 and t > args.hasta + 1e-6:
            break
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 80])

        # Cadencia real: el envio n sale en inicio + n * intervalo.
        if not args.sin_ritmo:
            espera = inicio_ritmo + n_envio * paso_s - time.perf_counter()
            if espera > 0:
                time.sleep(espera)
        n_envio += 1

        inicio = time.perf_counter()
        desde_anterior = round((inicio - ultimo_envio) * 1000, 1) if ultimo_envio is not None else ""
        ultimo_envio = inicio
        try:
            r = _enviar_frame(f"{args.url}/api/analizar-frame/{sesion_id}", buf.tobytes())
        except Exception as e:
            errores += 1
            print(f"  t={t:6.2f}s  ERROR: {e}")
            t += paso_s
            continue
        ida_vuelta_ms = (time.perf_counter() - inicio) * 1000

        if "alerta_sonora" in r:
            alerta_sonora = 1 if r["alerta_sonora"] else 0
        else:
            alerta_sonora = ""

        # Los frames anteriores a --desde solo sirven para calentar tracker y tasa.
        en_margen = args.desde > 0 and t < args.desde - 1e-6
        if en_margen:
            print(f"  t={t:6.2f}s  riesgo={r['nivel_riesgo']:<8} (margen, no se guarda)")
            t += paso_s
            continue

        fila = {
            "segundo": round(t, 2),
            "nivel_riesgo": r["nivel_riesgo"],
            "total_objetos": r["total_objetos"],
            "max_tasa_expansion": max(
                (o.get("tasa_expansion", 0.0) for o in r["objetos_detectados"]), default=0.0
            ),
            "ms_servidor": r.get("tiempo_procesamiento_ms", ""),
            "ms_ida_y_vuelta": round(ida_vuelta_ms, 1),
            "calentamiento": 1 if (n_envio - 1) < args.descartar_primeros else 0,
        }
        if etiquetas:
            fila["riesgo_esperado"] = nivel_esperado(etiquetas, t)
        fila["alerta_sonora"] = alerta_sonora
        fila["ms_desde_anterior"] = desde_anterior
        filas.append(fila)

        if jsonl:
            jsonl.write(json.dumps({
                "segundo": fila["segundo"],
                "nivel_riesgo": r["nivel_riesgo"],
                "alerta_sonora": alerta_sonora,
                "objetos": [_objeto_detalle(o) for o in r["objetos_detectados"]],
            }, ensure_ascii=False) + "\n")

        marca = "  (calentamiento)" if fila["calentamiento"] else ""
        pita = "  PITIDO" if alerta_sonora == 1 else ""
        print(f"  t={t:6.2f}s  riesgo={r['nivel_riesgo']:<8} objetos={r['total_objetos']:<2} "
              f"servidor={fila['ms_servidor']} ms  ida y vuelta={fila['ms_ida_y_vuelta']} ms"
              f"{marca}{pita}")

        t += paso_s
        if args.max_frames and len(filas) >= args.max_frames:
            break

    cap.release()
    if jsonl:
        jsonl.close()
    _json(f"{args.url}/api/sesiones/{sesion_id}/finalizar", "PATCH")

    if not filas:
        sys.exit("No se guardo ningun frame.")

    salida = args.salida or str(Path(args.video).with_suffix("")) + "_resultados.csv"
    with open(salida, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    # -- Resumen --
    validas = [f for f in filas if not f["calentamiento"]]
    if not validas:
        print("\nAVISO: todos los frames son de calentamiento; las estadisticas usan todos.")
        validas = filas
    ida = [f["ms_ida_y_vuelta"] for f in validas]
    servidor = [f["ms_servidor"] for f in validas if isinstance(f["ms_servidor"], (int, float))]

    print("\n" + "=" * 60)
    print(f"Frames guardados: {len(filas)}   Errores: {errores}   "
          f"Frames en estadisticas: {len(validas)} (sin {len(filas) - len(validas)} de calentamiento)")
    primeros = [f for f in filas if f["calentamiento"]]
    if primeros:
        print("Calentamiento (ida y vuelta, ms): " +
              ", ".join(f"{f['ms_ida_y_vuelta']:.0f}" for f in primeros))
    print(_linea_latencia("Latencia ida y vuelta", ida))
    print(_linea_latencia("Tiempo del servidor   ", servidor))
    bajo = 100 * sum(1 for x in ida if x <= 500) / len(ida)
    print(f"Frames con respuesta <= 500 ms: {bajo:.1f}%")
    cadencia = [f["ms_desde_anterior"] for f in filas if isinstance(f["ms_desde_anterior"], (int, float))]
    if cadencia:
        print(_linea_latencia("Cadencia real de envio ", cadencia))
    print("Distribucion de riesgo:", dict(Counter(f["nivel_riesgo"] for f in filas)))

    con_campo = [f for f in filas if f["alerta_sonora"] != ""]
    if con_campo:
        pitidos = sum(f["alerta_sonora"] for f in con_campo)
        altos = sum(1 for f in con_campo if f["nivel_riesgo"] == "alto")
        print(f"Alerta sonora: {pitidos} pitidos en {altos} frames alto")
    else:
        print("Alerta sonora: el backend no envio el campo alerta_sonora")

    print("Metricas del servidor:", json.dumps(_json(f"{args.url}/api/metricas"), ensure_ascii=False))

    if etiquetas:
        resumen_precision(filas)
    print(f"\nResultados guardados en: {salida}")
    if args.objetos_jsonl:
        print(f"Detalle por objeto en:  {args.objetos_jsonl}")


if __name__ == "__main__":
    main()
