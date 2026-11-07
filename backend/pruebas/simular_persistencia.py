"""
Simula, sobre test2_resultados.csv, una regla de "alarma sostenida sin acercamiento".
No toca el backend: solo muestra cuantos frames de alerta quedarian por episodio.

Regla: tras K frames seguidos en medio/alto sin acercamiento confirmado, el nivel baja a 'bajo'.
Un frame cuenta como "acercamiento confirmado" si su tasa >= umbral y al menos
CONFIRMAR de los ultimos VENTANA frames (incluido el actual) superan el umbral.
Con --confirmar 1 --ventana 1 se reproduce la regla anterior (un solo pico basta).

Uso (desde backend/, con el venv activo):
    python pruebas\simular_persistencia.py
    python pruebas\simular_persistencia.py --k 3 --confirmar 2 --ventana 3
    python pruebas\simular_persistencia.py --detalle E03
"""
import argparse
import statistics

from generar_episodios import CSV_POR_DEFECTO, ALERTA, detectar_episodios, leer_filas


def aplicar_regla(filas: list, k: int, tasa_max: float, confirmar: int, ventana: int) -> list:
    nuevos = []
    racha = 0
    flags = []
    for f in filas:
        sube = f["tasa"] >= tasa_max
        flags.append(sube)
        confirmado = sube and sum(flags[-ventana:]) >= confirmar
        if f["nivel"] in ALERTA and not confirmado:
            racha += 1
            nuevos.append("bajo" if racha > k else f["nivel"])
        else:
            racha = 0
            nuevos.append(f["nivel"])
    return nuevos


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", default=CSV_POR_DEFECTO)
    p.add_argument("--k", type=int, default=4, help="frames de alerta antes de silenciar")
    p.add_argument("--tasa", type=float, default=0.04, help="tasa minima considerada acercamiento")
    p.add_argument("--confirmar", type=int, default=2, help="frames con tasa alta requeridos en la ventana")
    p.add_argument("--ventana", type=int, default=3, help="tamano de la ventana en frames")
    p.add_argument("--detalle", default="", help="id de episodio a imprimir frame a frame (ej. E03)")
    a = p.parse_args()

    filas = leer_filas(a.csv)
    paso = statistics.median(filas[i + 1]["segundo"] - filas[i]["segundo"] for i in range(len(filas) - 1))
    nuevos = aplicar_regla(filas, a.k, a.tasa, a.confirmar, a.ventana)

    antes = sum(f["nivel"] in ALERTA for f in filas)
    despues = sum(n in ALERTA for n in nuevos)
    antes_alto = sum(f["nivel"] == "alto" for f in filas)
    despues_alto = sum(n == "alto" for n in nuevos)
    print(f"K={a.k} ({a.k * paso:.2f} s) | tasa >= {a.tasa} | confirmar {a.confirmar} de {a.ventana}")
    print(f"Frames en alerta: {antes} -> {despues} | frames alto: {antes_alto} -> {despues_alto}\n")

    print("Episodio  inicio     frames_alerta (antes -> despues)")
    for e in detectar_episodios(filas, paso, 2):
        i0 = round(e["inicio_s"] / paso)
        n = round(e["duracion_s"] / paso)
        ant = sum(f["nivel"] in ALERTA for f in filas[i0:i0 + n])
        des = sum(x in ALERTA for x in nuevos[i0:i0 + n])
        print(f"  {e['id']}     {e['inicio']:>6}     {ant:>3} -> {des:<3}")
        if a.detalle and e["id"] == a.detalle.upper():
            print("      segundo  original -> nuevo   tasa")
            for j in range(i0, i0 + n):
                print(f"      {filas[j]['segundo']:>7}  {filas[j]['nivel']:<8} -> {nuevos[j]:<8} {filas[j]['tasa']}")


if __name__ == "__main__":
    main()
