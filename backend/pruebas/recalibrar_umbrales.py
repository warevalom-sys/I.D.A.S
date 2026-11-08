"""
Recalibracion offline de umbrales de area por clase, sobre el detalle por objeto
de la corrida a ritmo real (test2_objetos.jsonl) y los 14 intervalos revisados.

No modifica el backend. Reproduce las reglas de services/riesgo.py (importando
sus constantes) y prueba umbrales de AREA_MEDIO distintos para vulnerables
(persona, bicicleta) y vehiculos. Las reglas de tasa no cambian.

Supuesto: R04 y R09 cuentan como positivos completos (opcion 1).

Medidas por candidato:
  - positivos directos detectados (al menos un frame medio/alto), de 8
  - falsas alarmas: frames medio/alto dentro de los controles N01-N03
  - frames medio/alto fuera de todo tramo etiquetado (costo de bajar umbrales)

Uso (desde backend/, con el venv activo):
    python pruebas\recalibrar_umbrales.py
    python pruebas\recalibrar_umbrales.py --persona-medio 0.008 --vehiculo-medio 0.05
"""
import argparse
import csv
import json
import sys
from collections import Counter
from pathlib import Path

AQUI = Path(__file__).resolve().parent
sys.path.insert(0, str(AQUI.parent))
from services import riesgo as R  # noqa: E402

JSONL = AQUI / "resultados" / "test2_objetos.jsonl"
INTERVALOS = AQUI / "datos" / "revision_test2_ritmo_reconstruida.csv"
VULNERABLES = {"persona", "bicicleta"}
ORDEN = {"ninguno": 0, "bajo": 1, "medio": 2, "alto": 3}
ALERTA = ("medio", "alto")


def cargar_frames(ruta):
    frames = []
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            if linea.strip():
                frames.append(json.loads(linea))
    return frames


def cargar_intervalos(ruta):
    out = []
    with open(ruta, newline="", encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            out.append({"id": r["id"], "ini": float(r["inicio_s"]),
                        "fin": float(r["fin_s"]), "grupo": r["grupo"]})
    return out


def nivel_objeto(o, area_medio):
    x = o.get("x")
    if x is None:
        return "ninguno"
    area = o.get("area") or 0.0
    tasa = o.get("tasa") or 0.0
    if R.ZONA_CENTRAL_MIN <= x <= R.ZONA_CENTRAL_MAX:
        if area > R.AREA_ALTO:
            return "alto"
        if area >= R.AREA_MIN_ACERCAMIENTO_ALTO and tasa >= R.TASA_ACERCAMIENTO_ALTO:
            return "alto"
        if area > area_medio:
            return "medio"
        if area >= R.AREA_MIN_ACERCAMIENTO_MEDIO and tasa >= R.TASA_ACERCAMIENTO_MEDIO:
            return "medio"
    if area > R.AREA_BAJO:
        return "bajo"
    return "ninguno"


def nivel_frame(frame, persona_medio, vehiculo_medio):
    mejor = "ninguno"
    for o in frame["objetos"]:
        am = persona_medio if o.get("clase") in VULNERABLES else vehiculo_medio
        n = nivel_objeto(o, am)
        if ORDEN[n] > ORDEN[mejor]:
            mejor = n
    return mejor


def evaluar(frames, intervalos, pm, vm):
    niveles = [nivel_frame(f, pm, vm) for f in frames]
    det = {}
    for iv in intervalos:
        idx = [i for i, f in enumerate(frames) if iv["ini"] <= f["segundo"] <= iv["fin"]]
        det[iv["id"]] = (sum(niveles[i] in ALERTA for i in idx), len(idx))
    etiquetados = set()
    for iv in intervalos:
        for i, f in enumerate(frames):
            if iv["ini"] <= f["segundo"] <= iv["fin"]:
                etiquetados.add(i)
    positivos = [iv for iv in intervalos if iv["grupo"] == "positivo_directo"]
    controles = [iv for iv in intervalos if iv["grupo"] == "control_negativo"]
    return {
        "niveles": niveles,
        "det": det,
        "pos_detectados": sum(det[iv["id"]][0] > 0 for iv in positivos),
        "pos_total": len(positivos),
        "fa_controles": sum(det[iv["id"]][0] for iv in controles),
        "fuera": sum(niveles[i] in ALERTA for i in range(len(frames)) if i not in etiquetados),
        "total_alerta": sum(n in ALERTA for n in niveles),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--jsonl", default=str(JSONL))
    ap.add_argument("--intervalos", default=str(INTERVALOS))
    ap.add_argument("--persona-medio", type=float, default=None)
    ap.add_argument("--vehiculo-medio", type=float, default=None)
    a = ap.parse_args()

    frames = cargar_frames(a.jsonl)
    intervalos = cargar_intervalos(a.intervalos)
    print(f"Frames: {len(frames)} | intervalos: {len(intervalos)}")

    # 1) Linea base: debe reproducir lo que devolvio el backend.
    base = evaluar(frames, intervalos, R.AREA_MEDIO, R.AREA_MEDIO)
    dist = Counter(base["niveles"])
    reales = Counter(f["nivel_riesgo"] for f in frames)
    difer = sum(1 for n, f in zip(base["niveles"], frames) if n != f["nivel_riesgo"])
    print("Recalculado:", {k: dist.get(k, 0) for k in ORDEN})
    print("Backend    :", {k: reales.get(k, 0) for k in ORDEN})
    print(f"Frames con nivel distinto: {difer}")
    if difer:
        print("\nLa linea base NO coincide con el backend. No sigo: hay que revisar el script.")
        return
    print("Linea base OK.\n")

    # 2) Rejilla de candidatos.
    pers = [0.06, 0.03, 0.02, 0.015, 0.01, 0.008, 0.006]
    veh = [0.06, 0.05, 0.04, 0.03]
    print(f"{'persona_medio':>13} {'vehic_medio':>11} {'positivos':>10} "
          f"{'FA_N01-N03':>11} {'fuera_tramos':>13} {'medio/alto_total':>17}")
    for vm in veh:
        for pm in pers:
            r = evaluar(frames, intervalos, pm, vm)
            marca = "  <- actual" if (pm == R.AREA_MEDIO and vm == R.AREA_MEDIO) else ""
            print(f"{pm:>13} {vm:>11} {str(r['pos_detectados']) + '/' + str(r['pos_total']):>10} "
                  f"{r['fa_controles']:>11} {r['fuera']:>13} {r['total_alerta']:>17}{marca}")

    # 3) Detalle por intervalo de un candidato.
    if a.persona_medio is not None and a.vehiculo_medio is not None:
        r = evaluar(frames, intervalos, a.persona_medio, a.vehiculo_medio)
        print(f"\nDetalle persona_medio={a.persona_medio} vehiculo_medio={a.vehiculo_medio}")
        print(f"{'id':<5}{'grupo':<18}{'medio/alto':>10}{'frames':>8}")
        for iv in intervalos:
            m, n = r["det"][iv["id"]]
            print(f"{iv['id']:<5}{iv['grupo']:<18}{m:>10}{n:>8}")


if __name__ == "__main__":
    main()
