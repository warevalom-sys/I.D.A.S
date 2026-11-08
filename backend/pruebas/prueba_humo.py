"""
Prueba de humo: comprueba en menos de un minuto que el backend completo funciona.

Pensada para correr justo antes de una demostración o de una entrega, con el
servidor encendido (el mismo comando de siempre: uvicorn app:app --port 8000).
No evalúa la calidad de las detecciones; comprueba que cada pieza responde
como debe: servidor, sesiones, análisis con el modelo, base de datos,
alerta, reglas de error y métricas.

Uso:
    python pruebas/prueba_humo.py
    python pruebas/prueba_humo.py --auth      # además prueba registro y login (crea un usuario de prueba)
    python pruebas/prueba_humo.py --url http://127.0.0.1:8000

Termina con código 0 si todo pasó y 1 si algo falló (sirve también en scripts).
Cada ejecución crea una sesión de prueba, que queda finalizada.
"""
import argparse
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

import cv2
import numpy as np


# ───────────────────────── HTTP (sin dependencias) ─────────────────────────
def pedir(url, metodo="GET", json_cuerpo=None, timeout=60):
    """Devuelve (código HTTP, cuerpo JSON o texto). No lanza error en 4xx/5xx."""
    datos = json.dumps(json_cuerpo).encode() if json_cuerpo is not None else None
    req = urllib.request.Request(
        url, data=datos, method=metodo,
        headers={"Content-Type": "application/json"} if datos else {},
    )
    return _ejecutar(req, timeout)


def enviar_archivo(url, contenido: bytes, tipo="image/jpeg", nombre="frame.jpg", timeout=60):
    frontera = uuid.uuid4().hex
    cuerpo = (
        f"--{frontera}\r\n"
        f'Content-Disposition: form-data; name="frame"; filename="{nombre}"\r\n'
        f"Content-Type: {tipo}\r\n\r\n"
    ).encode() + contenido + f"\r\n--{frontera}--\r\n".encode()
    req = urllib.request.Request(
        url, data=cuerpo, method="POST",
        headers={"Content-Type": f"multipart/form-data; boundary={frontera}"},
    )
    return _ejecutar(req, timeout)


def _ejecutar(req, timeout):
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            texto = r.read().decode("utf-8", "replace")
            codigo = r.status
    except urllib.error.HTTPError as e:
        texto, codigo = e.read().decode("utf-8", "replace"), e.code
    try:
        return codigo, json.loads(texto)
    except ValueError:
        return codigo, texto


# ─────────────────────────────── Comprobaciones ───────────────────────────────
resultados = []


def comprobar(nombre, condicion, detalle=""):
    resultados.append(bool(condicion))
    print(f"  [{'OK ' if condicion else 'FALLA'}] {nombre}" + (f"  ({detalle})" if detalle else ""))
    return bool(condicion)


def imagen_de_prueba() -> bytes:
    """Frame sintético: fondo gris con un rectángulo claro (no busca detecciones)."""
    img = np.full((360, 640, 3), 90, np.uint8)
    cv2.rectangle(img, (240, 100), (400, 330), (200, 200, 200), -1)
    return cv2.imencode(".jpg", img)[1].tobytes()


def main():
    ap = argparse.ArgumentParser(description="Prueba de humo del backend IDSS.")
    ap.add_argument("--url", default="http://127.0.0.1:8000")
    ap.add_argument("--auth", action="store_true", help="Probar también registro y login")
    args = ap.parse_args()
    base = args.url.rstrip("/")
    jpg = imagen_de_prueba()

    print(f"Prueba de humo contra {base}\n")

    print("1. Servidor")
    try:
        codigo, cuerpo = pedir(f"{base}/health", timeout=5)
    except Exception as e:
        print(f"  [FALLA] No se pudo conectar: {e}\n  ¿Está corriendo uvicorn en ese puerto?")
        sys.exit(1)
    comprobar("GET /health responde ok", codigo == 200 and isinstance(cuerpo, dict) and cuerpo.get("status") == "ok")
    pedir(f"{base}/api/metricas/reiniciar", "POST")

    print("\n2. Sesión y análisis (usa el modelo; el primer frame es más lento)")
    codigo, cuerpo = pedir(f"{base}/api/sesiones", "POST", {})
    sesion_id = cuerpo.get("sesion_id") if isinstance(cuerpo, dict) else None
    comprobar("Crear sesión", codigo == 200 and isinstance(sesion_id, int), f"sesion_id={sesion_id}")
    if not isinstance(sesion_id, int):
        print("\nNo se puede continuar sin sesión.")
        sys.exit(1)

    url_frame = f"{base}/api/analizar-frame/{sesion_id}"
    t0 = time.perf_counter()
    codigo, r1 = enviar_archivo(url_frame, jpg)
    ms1 = (time.perf_counter() - t0) * 1000
    comprobar("Analizar primer frame (calentamiento)", codigo == 200, f"{ms1:.0f} ms")
    time.sleep(0.2)
    t0 = time.perf_counter()
    codigo, r2 = enviar_archivo(url_frame, jpg)
    ms2 = (time.perf_counter() - t0) * 1000
    comprobar("Analizar segundo frame", codigo == 200, f"{ms2:.0f} ms")

    r = r2 if isinstance(r2, dict) else {}
    comprobar("Respuesta con estado ok y lista de objetos",
              r.get("estado") == "ok" and isinstance(r.get("objetos_detectados"), list))
    comprobar("Nivel de riesgo válido", r.get("nivel_riesgo") in ("ninguno", "bajo", "medio", "alto"),
              str(r.get("nivel_riesgo")))
    comprobar("Campo alerta_sonora (booleano)", isinstance(r.get("alerta_sonora"), bool))
    comprobar("Tiempos de procesamiento presentes",
              all(isinstance(r.get(k), (int, float)) for k in ("tiempo_procesamiento_ms", "tiempo_bd_ms")),
              f"servidor={r.get('tiempo_procesamiento_ms')} ms, base de datos={r.get('tiempo_bd_ms')} ms")

    print("\n3. Persistencia")
    codigo, frames = pedir(f"{base}/api/sesiones/{sesion_id}/frames")
    comprobar("Los frames quedaron guardados", codigo == 200 and isinstance(frames, list) and len(frames) >= 2,
              f"{len(frames) if isinstance(frames, list) else '?'} frames")
    codigo, _ = pedir(f"{base}/api/sesiones/{sesion_id}/alertas")
    comprobar("Consultar alertas de la sesión", codigo == 200)

    print("\n4. Cierre y reglas de error")
    codigo, cuerpo = pedir(f"{base}/api/sesiones/{sesion_id}/finalizar", "PATCH")
    comprobar("Finalizar sesión", codigo == 200 and isinstance(cuerpo, dict) and cuerpo.get("estado") == "finalizada")
    codigo, _ = enviar_archivo(url_frame, jpg)
    comprobar("Frame a sesión finalizada -> 409", codigo == 409, f"recibió {codigo}")
    codigo, _ = enviar_archivo(f"{base}/api/analizar-frame/999999", jpg)
    comprobar("Frame a sesión inexistente -> 404", codigo == 404, f"recibió {codigo}")
    codigo, sesion_b = pedir(f"{base}/api/sesiones", "POST", {})
    if isinstance(sesion_b, dict) and sesion_b.get("sesion_id"):
        codigo, _ = enviar_archivo(f"{base}/api/analizar-frame/{sesion_b['sesion_id']}", b"hola", "text/plain", "x.txt")
        comprobar("Archivo que no es imagen -> 400", codigo == 400, f"recibió {codigo}")
        pedir(f"{base}/api/sesiones/{sesion_b['sesion_id']}/finalizar", "PATCH")

    print("\n5. Métricas")
    codigo, m = pedir(f"{base}/api/metricas")
    m = m if isinstance(m, dict) else {}
    comprobar("GET /api/metricas con latencia de inferencia y de base de datos",
              codigo == 200 and "latencia_inferencia_ms" in m and "latencia_bd_ms" in m)
    if m.get("latencia_total_ms"):
        print(f"       latencia servidor: promedio {m['latencia_total_ms']['promedio']} ms, "
              f"p95 {m['latencia_total_ms']['p95']} ms; base de datos: promedio {m['latencia_bd_ms']['promedio']} ms")

    if args.auth:
        print("\n6. Autenticación")
        correo = f"humo_{uuid.uuid4().hex[:8]}@example.com"
        datos = {"nombre": "Prueba de humo", "email": correo, "password": "Humo12345",
                 "modo_preferido": "ciclista", "tiene_auto": False}
        codigo, _ = pedir(f"{base}/api/auth/registro", "POST", datos)
        comprobar("Registrar usuario", codigo == 200, f"recibió {codigo}")
        codigo, _ = pedir(f"{base}/api/auth/registro", "POST", datos)
        comprobar("Registro duplicado rechazado (400)", codigo == 400, f"recibió {codigo}")
        codigo, _ = pedir(f"{base}/api/auth/login", "POST", {"email": correo, "password": "Humo12345"})
        comprobar("Login correcto", codigo == 200, f"recibió {codigo}")
        codigo, _ = pedir(f"{base}/api/auth/login", "POST", {"email": correo, "password": "incorrecta"})
        comprobar("Login con clave incorrecta rechazado", codigo in (400, 401), f"recibió {codigo}")

    ok = all(resultados)
    print("\n" + "=" * 55)
    print(f"{sum(resultados)} de {len(resultados)} comprobaciones OK  ->  " + ("TODO OK" if ok else "HAY FALLAS"))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()