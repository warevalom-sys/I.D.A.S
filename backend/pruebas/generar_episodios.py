"""
Genera episodios_test2.csv a partir del CSV de resultados de probar_video.py.

- Agrupa tramos continuos de riesgo medio/alto (tolera huecos cortos).
- Agrega ventanas al azar sin alertas, para detectar alertas perdidas.
- Deja 'veredicto' y 'escena_nota' vacias para rellenarlas a mano.

Uso (desde backend/, con el venv activo):
    python pruebas\generar_episodios.py
    python pruebas\generar_episodios.py --brecha 3 --semilla 7
"""
import argparse
import csv
import random
import statistics
from pathlib import Path

CSV_POR_DEFECTO = r"C:\Users\USER\Downloads\test2_resultados.csv"
SALIDA_POR_DEFECTO = Path(__file__).resolve().parent / "episodios_test2.csv"
ALERTA = ("medio", "alto")
ORDEN = ["ninguno", "bajo", "medio", "alto"]


def mmss(segundos: float) -> str:
    s = int(segundos)
    return f"{s // 60}:{s % 60:02d}"


def leer_filas(ruta: str) -> list:
    filas = []
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            filas.append({
                "segundo": float(r["segundo"]),
                "nivel": r["nivel_riesgo"].strip().lower(),
                "objetos": int(r["total_objetos"]),
                "tasa": float(r["max_tasa_expansion"]),
                "calentamiento": int(r["calentamiento"]),
            })
    return filas


def construir_episodio(tramo: list, paso: float, numero: int) -> dict:
    inicio = tramo[0]["segundo"]
    fin = tramo[-1]["segundo"] + paso
    tasas = [f["tasa"] for f in tramo]
    return {
        "id": f"E{numero:02d}",
        "tipo": "alerta",
        "inicio": mmss(inicio),
        "fin": mmss(fin),
        "inicio_s": round(inicio, 2),
        "duracion_s": round(fin - inicio, 2),
        "riesgo_max": "alto" if any(f["nivel"] == "alto" for f in tramo) else "medio",
        "frames": len(tramo),
        "frames_alto": sum(f["nivel"] == "alto" for f in tramo),
        "frames_medio": sum(f["nivel"] == "medio" for f in tramo),
        "max_objetos": max(f["objetos"] for f in tramo),
        "tasa_max": round(max(tasas), 4),
        "tasa_mediana": round(statistics.median(tasas), 4),
        "veredicto": "",
        "escena_nota": "",
    }


def detectar_episodios(filas: list, paso: float, brecha: int) -> list:
    episodios = []
    inicio = None
    ultimo = None
    for i, f in enumerate(filas):
        if f["nivel"] in ALERTA:
            if inicio is None:
                inicio = i
            ultimo = i
        elif inicio is not None and i - ultimo > brecha:
            episodios.append(construir_episodio(filas[inicio:ultimo + 1], paso, len(episodios) + 1))
            inicio = None
    if inicio is not None:
        episodios.append(construir_episodio(filas[inicio:ultimo + 1], paso, len(episodios) + 1))
    return episodios


def ventanas_sin_alerta(filas: list, paso: float, ventana_s: float, cantidad: int, semilla: int) -> list:
    n = max(1, round(ventana_s / paso))
    candidatas = []
    for i in range(len(filas) - n + 1):
        w = filas[i:i + n]
        if any(f["nivel"] in ALERTA for f in w):
            continue
        if sum(f["nivel"] == "ninguno" for f in w) / n >= 0.7:
            candidatas.append(i)

    rng = random.Random(semilla)
    rng.shuffle(candidatas)
    elegidas = []
    for i in candidatas:
        if all(abs(i - j) >= n for j in elegidas):
            elegidas.append(i)
        if len(elegidas) == cantidad:
            break

    salida = []
    for k, i in enumerate(sorted(elegidas), start=1):
        w = filas[i:i + n]
        inicio = w[0]["segundo"]
        fin = w[-1]["segundo"] + paso
        tasas = [f["tasa"] for f in w]
        salida.append({
            "id": f"N{k:02d}",
            "tipo": "ninguno_azar",
            "inicio": mmss(inicio),
            "fin": mmss(fin),
            "inicio_s": round(inicio, 2),
            "duracion_s": round(fin - inicio, 2),
            "riesgo_max": max((f["nivel"] for f in w), key=ORDEN.index),
            "frames": len(w),
            "frames_alto": 0,
            "frames_medio": 0,
            "max_objetos": max(f["objetos"] for f in w),
            "tasa_max": round(max(tasas), 4),
            "tasa_mediana": round(statistics.median(tasas), 4),
            "veredicto": "",
            "escena_nota": "",
        })
    return salida


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default=CSV_POR_DEFECTO)
    p.add_argument("--salida", default=str(SALIDA_POR_DEFECTO))
    p.add_argument("--brecha", type=int, default=2,
                   help="frames seguidos sin alerta tolerados dentro de un episodio")
    p.add_argument("--ventana", type=float, default=25.0, help="segundos de cada ventana al azar")
    p.add_argument("--n-azar", type=int, default=3)
    p.add_argument("--semilla", type=int, default=42)
    a = p.parse_args()

    filas = leer_filas(a.csv)
    if len(filas) < 2:
        raise SystemExit("El CSV tiene muy pocas filas.")
    paso = statistics.median(filas[i + 1]["segundo"] - filas[i]["segundo"] for i in range(len(filas) - 1))

    episodios = detectar_episodios(filas, paso, a.brecha)
    azar = ventanas_sin_alerta(filas, paso, a.ventana, a.n_azar, a.semilla)
    todo = episodios + azar

    campos = ["id", "tipo", "inicio", "fin", "inicio_s", "duracion_s", "riesgo_max", "frames",
              "frames_alto", "frames_medio", "max_objetos", "tasa_max", "tasa_mediana",
              "veredicto", "escena_nota"]
    salida = Path(a.salida)
    with open(salida, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos)
        w.writeheader()
        w.writerows(todo)

    print(f"Frames leidos: {len(filas)} | paso: {paso:.2f} s | ultimo segundo: {filas[-1]['segundo']}")
    print(f"Frames medio: {sum(f['nivel'] == 'medio' for f in filas)} | "
          f"alto: {sum(f['nivel'] == 'alto' for f in filas)}")
    print(f"Episodios de alerta: {len(episodios)} | ventanas sin alerta: {len(azar)}")
    for e in todo:
        print(f"  {e['id']} {e['tipo']:<13} {e['inicio']:>6} - {e['fin']:<6} "
              f"{e['duracion_s']:>6} s  max={e['riesgo_max']:<7} "
              f"alto={e['frames_alto']:<3} medio={e['frames_medio']:<3} "
              f"objs={e['max_objetos']} tasa_med={e['tasa_mediana']}")
    print(f"\nArchivo: {salida}")


if __name__ == "__main__":
    main()
