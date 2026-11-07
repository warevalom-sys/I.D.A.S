"""
Prueba de concurrencia: ¿cuántos usuarios simultáneos aguanta el backend?

Simula N usuarios virtuales. Cada uno crea su propia sesión y envía un frame
cada --intervalo-ms (750 por defecto, igual que el frontend), esperando la
respuesta antes de enviar el siguiente. Se repite con cada nivel de --niveles
y se muestra una tabla con la latencia y si ese nivel "pasa" estos criterios:

    1. 0 errores (ni timeouts ni respuestas HTTP de error)
    2. latencia p95 <= --limite-ms (500 por defecto, riesgo R3 del proyecto)
    3. cada usuario logra al menos el 90% de la cadencia nominal de frames

El resultado final es el mayor nivel que cumple los tres criterios.

Uso:
    python pruebas/prueba_concurrencia.py videos/ciclovia.mp4
    python pruebas/prueba_concurrencia.py videos/ciclovia.mp4 --niveles 1,2,3,4,5,6 --duracion 30

IMPORTANTE para que la prueba sea válida:
  - Inicia el servidor SIN --reload y con el límite de sesiones subido:
        PowerShell:  $env:IDSS_MAX_SESIONES = 12
                     uvicorn app:app --host 127.0.0.1 --port 8000
    (por defecto el límite es 4 y las sesiones sobrantes se descartan)
  - Corre el script en la misma máquina (--url http://127.0.0.1:8000) para medir
    la capacidad del servidor sin la red. Para medir con la red real, repítelo
    apuntando al túnel y compara: la diferencia es la latencia de la red.
  - Cierra otras aplicaciones pesadas durante la prueba.

Solo usa la librería estándar y OpenCV.
"""
import argparse
import csv
import json
import statistics
import sys
import threading
import time
import urllib.request
import uuid

import cv2


# ───────────────────────── HTTP (sin dependencias) ─────────────────────────
def _json(url, metodo="GET", cuerpo=None, timeout=30):
    datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
    req = urllib.request.Request(
        url, data=datos, method=metodo,
        headers={"Content-Type": "application/json"} if datos else {},
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def _enviar_frame(url, jpg: bytes, timeout):
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
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


# ───────────────────────────── Frames de prueba ─────────────────────────────
def cargar_frames(ruta_video, intervalo_ms, ancho, max_frames=40):
    """Extrae frames del video (uno cada intervalo) y los deja en JPEG."""
    cap = cv2.VideoCapture(ruta_video)
    if not cap.isOpened():
        sys.exit(f"No se pudo abrir el video: {ruta_video}")
    frames, t = [], 0.0
    while len(frames) < max_frames:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, frame = cap.read()
        if not ok:
            break
        if ancho and frame.shape[1] > ancho:
            alto = int(frame.shape[0] * ancho / frame.shape[1])
            frame = cv2.resize(frame, (ancho, alto))
        frames.append(cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])[1].tobytes())
        t += intervalo_ms / 1000
    cap.release()
    if not frames:
        sys.exit("No se pudo extraer ningún frame del video.")
    return frames


# ───────────────────────────── Usuario virtual ─────────────────────────────
def usuario_virtual(idx, url, frames, intervalo_s, duracion_s, timeout_s, resultado):
    lat, errores = [], 0
    try:
        sesion = _json(f"{url}/api/sesiones", "POST", {})["sesion_id"]
    except Exception:
        resultado[idx] = {"lat": [], "errores": 1, "enviados": 0}
        return

    inicio = time.perf_counter()
    siguiente = inicio
    i = idx * 3  # cada usuario arranca en un punto distinto del video
    enviados = 0
    while time.perf_counter() - inicio < duracion_s:
        espera = siguiente - time.perf_counter()
        if espera > 0:
            time.sleep(espera)
        t0 = time.perf_counter()
        try:
            r = _enviar_frame(f"{url}/api/analizar-frame/{sesion}", frames[i % len(frames)], timeout_s)
            if r.get("estado") != "ok":
                errores += 1
            else:
                lat.append((time.perf_counter() - t0) * 1000)
        except Exception:
            errores += 1
        enviados += 1
        i += 1
        # Cadencia fija; si la respuesta tardó más que el intervalo, el
        # siguiente frame sale de inmediato (como un cliente real saturado).
        siguiente = max(siguiente + intervalo_s, time.perf_counter())
    try:
        _json(f"{url}/api/sesiones/{sesion}/finalizar", "PATCH")
    except Exception:
        pass
    resultado[idx] = {"lat": lat, "errores": errores, "enviados": enviados}


def percentil(valores, p):
    if not valores:
        return float("nan")
    v = sorted(valores)
    return v[int(round(p * (len(v) - 1)))]


# ─────────────────────────────── Principal ───────────────────────────────
def main():
    ap = argparse.ArgumentParser(description="Prueba de concurrencia del backend IDSS.")
    ap.add_argument("video")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--niveles", default="1,2,3,4,5,6", help="Usuarios simultáneos a probar, p. ej. 1,2,4,8")
    ap.add_argument("--duracion", type=int, default=20, help="Segundos por nivel")
    ap.add_argument("--intervalo-ms", type=int, default=750)
    ap.add_argument("--limite-ms", type=int, default=500, help="Límite de latencia p95")
    ap.add_argument("--timeout-s", type=float, default=8.0, help="Timeout por petición (como el frontend)")
    ap.add_argument("--ancho", type=int, default=640, help="Reducir los frames a este ancho (0 = sin reducir)")
    ap.add_argument("--no-parar", action="store_true", help="Seguir probando niveles aunque uno falle")
    ap.add_argument("--salida", default="concurrencia_resultados.csv")
    args = ap.parse_args()

    niveles = [int(x) for x in args.niveles.split(",") if x.strip()]
    intervalo_s = args.intervalo_ms / 1000
    nominal_fps = 1 / intervalo_s

    try:
        _json(f"{args.url}/health", timeout=5)
    except Exception as e:
        sys.exit(f"No se pudo conectar al backend en {args.url}: {e}")

    frames = cargar_frames(args.video, args.intervalo_ms, args.ancho)
    kb = statistics.mean(len(f) for f in frames) / 1024
    print(f"{len(frames)} frames de prueba (~{kb:.0f} KB cada uno). "
          f"Cadencia nominal: {nominal_fps:.2f} fps por usuario. Límite p95: {args.limite_ms} ms\n")

    cabecera = (f"{'Usuarios':>8} {'Frames':>7} {'Errores':>8} {'p50 ms':>8} {'p95 ms':>8} "
                f"{'Máx ms':>8} {'fps/usuario':>12} {'<=límite':>9}  Resultado")
    print(cabecera)
    print("-" * len(cabecera))

    filas, maximo_viable = [], 0
    for n in niveles:
        try:
            _json(f"{args.url}/api/metricas/reiniciar", "POST")
        except Exception:
            pass

        resultado = {}
        hilos = [threading.Thread(target=usuario_virtual,
                                  args=(k, args.url, frames, intervalo_s, args.duracion,
                                        args.timeout_s, resultado))
                 for k in range(n)]
        t0 = time.perf_counter()
        [h.start() for h in hilos]
        [h.join() for h in hilos]
        real = time.perf_counter() - t0

        lat = [x for r in resultado.values() for x in r["lat"]]
        errores = sum(r["errores"] for r in resultado.values())
        enviados = sum(r["enviados"] for r in resultado.values())
        fps_usuario = (len(lat) / n) / real if real else 0
        p50, p95, mx = percentil(lat, 0.5), percentil(lat, 0.95), max(lat, default=float("nan"))
        pct = 100 * sum(1 for x in lat if x <= args.limite_ms) / len(lat) if lat else 0

        motivos = []
        if errores > 0:
            motivos.append(f"{errores} errores")
        if lat and p95 > args.limite_ms:
            motivos.append("p95 sobre el límite")
        if fps_usuario < 0.9 * nominal_fps:
            motivos.append("no sostiene la cadencia")
        if not lat:
            motivos.append("sin respuestas")
        paso = not motivos

        try:
            m = _json(f"{args.url}/api/metricas")
            inf = m.get("latencia_inferencia_ms", {}).get("promedio", "")
        except Exception:
            inf = ""

        print(f"{n:>8} {enviados:>7} {errores:>8} {p50:>8.0f} {p95:>8.0f} {mx:>8.0f} "
              f"{fps_usuario:>12.2f} {pct:>8.0f}%  {'PASA' if paso else 'FALLA: ' + ', '.join(motivos)}")
        filas.append({"usuarios": n, "frames": enviados, "errores": errores,
                      "p50_ms": round(p50, 1), "p95_ms": round(p95, 1), "max_ms": round(mx, 1),
                      "fps_por_usuario": round(fps_usuario, 2), "pct_bajo_limite": round(pct, 1),
                      "inferencia_prom_ms_servidor": inf, "pasa": paso})

        if paso:
            maximo_viable = n
        elif not args.no_parar:
            print("\nSe detiene en el primer nivel que falla (usa --no-parar para seguir).")
            break

    with open(args.salida, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)

    print("\n" + "=" * 60)
    if maximo_viable:
        print(f"Usuarios simultáneos viables con estos criterios: {maximo_viable}")
    else:
        print("Ni siquiera 1 usuario cumple los criterios: revisa la latencia base del servidor.")
    print(f"Resultados guardados en: {args.salida}")


if __name__ == "__main__":
    main()