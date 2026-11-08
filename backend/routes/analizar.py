import time

from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional
from pydantic import BaseModel

from services.detector import (
    procesar_frame,
    limpiar_tracking_sesion,
    obtener_metricas,
    reiniciar_metricas,
    registrar_latencia_bd,
)
from services.alerta import evaluar, limpiar_sesion

from database.crud import (
    crear_sesion,
    guardar_frame,
    obtener_sesion_por_id,
    obtener_todas_sesiones,
    obtener_frames_de_sesion,
    obtener_alertas_de_sesion,
    finalizar_sesion,
    actualizar_video_sesion,
)
from database.mantenimiento import cerrar_sesiones_abandonadas

router = APIRouter(prefix="/api", tags=["Análisis"])


@router.on_event("startup")
def cerrar_sesiones_de_ejecucion_anterior():
    """Las sesiones que quedaron 'activas' pertenecen a una ejecución anterior."""
    cerradas = cerrar_sesiones_abandonadas(al_arrancar=True)
    if cerradas:
        print(f"[IDSS] {cerradas} sesión(es) abierta(s) de una ejecución anterior se marcaron como finalizadas.")


class VideoUpdateRequest(BaseModel):
    video_local_uri: str


class IniciarSesionRequest(BaseModel):
    usuario_id: Optional[int] = None
    vehiculo_id: Optional[int] = None


@router.post("/sesiones")
async def iniciar_sesion(datos: IniciarSesionRequest = IniciarSesionRequest()):
    # Limpieza de sesiones abandonadas; nunca debe impedir crear la nueva.
    try:
        cerrar_sesiones_abandonadas(minutos=30)
    except Exception as e:
        print(f"[IDSS] No se pudieron cerrar sesiones abandonadas: {e}")

    sesion_id = crear_sesion(usuario_id=datos.usuario_id, vehiculo_id=datos.vehiculo_id)
    return {
        "mensaje": "Sesion creada correctamente",
        "sesion_id": sesion_id
    }


@router.get("/sesiones")
async def listar_sesiones():
    return obtener_todas_sesiones()


@router.get("/sesiones/{sesion_id}/frames")
async def listar_frames(sesion_id: int):
    if not obtener_sesion_por_id(sesion_id):
        raise HTTPException(status_code=404, detail="La sesión no existe")
    return obtener_frames_de_sesion(sesion_id)


@router.get("/sesiones/{sesion_id}/alertas")
async def listar_alertas(sesion_id: int):
    if not obtener_sesion_por_id(sesion_id):
        raise HTTPException(status_code=404, detail="La sesión no existe")
    return obtener_alertas_de_sesion(sesion_id)


@router.patch("/sesiones/{sesion_id}/finalizar")
async def finalizar_sesion_endpoint(sesion_id: int):
    sesion = finalizar_sesion(sesion_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="La sesión no existe")

    # Libera los historiales en memoria de esta sesión.
    limpiar_tracking_sesion(sesion_id)
    limpiar_sesion(sesion_id)

    return {
        "mensaje": "Sesión finalizada correctamente",
        "sesion_id": sesion.id,
        "estado": sesion.estado,
        "fecha_fin": sesion.fecha_fin.isoformat() if sesion.fecha_fin else None,
    }


@router.patch("/sesiones/{sesion_id}/video")
async def actualizar_video_endpoint(sesion_id: int, datos: VideoUpdateRequest):
    sesion = actualizar_video_sesion(sesion_id, datos.video_local_uri)
    if not sesion:
        raise HTTPException(status_code=404, detail="La sesión no existe")

    return {
        "mensaje": "Referencia de video registrada correctamente",
        "sesion_id": sesion.id,
        "tiene_video": sesion.tiene_video,
        "video_local_uri": sesion.video_local_uri,
    }


@router.post("/analizar-frame/{sesion_id}")
async def analizar_frame(sesion_id: int, frame: UploadFile = File(...)):
    inicio_ruta = time.perf_counter()

    t = time.perf_counter()
    sesion = obtener_sesion_por_id(sesion_id)
    bd_ms = (time.perf_counter() - t) * 1000
    if not sesion:
        raise HTTPException(status_code=404, detail="La sesión no existe")
    # Una sesión finalizada ya no acepta frames: el cliente debe abrir una nueva.
    if sesion.estado == "finalizada":
        raise HTTPException(status_code=409, detail="La sesión ya fue finalizada")
    if not (frame.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    try:
        contenido = await frame.read()
        resultado = procesar_frame(contenido, sesion_id)

        if resultado["estado"] == "error":
            raise HTTPException(status_code=422, detail=resultado["mensaje"])

        t = time.perf_counter()
        guardar_frame(sesion_id, resultado)
        bd_ms += (time.perf_counter() - t) * 1000

        # Se agrega a la respuesta, sin persistir esta señal en guardar_frame().
        resultado["alerta_sonora"] = evaluar(sesion_id, resultado)

        ruta_ms = (time.perf_counter() - inicio_ruta) * 1000
        registrar_latencia_bd(bd_ms, ruta_ms)
        resultado["tiempo_bd_ms"] = round(bd_ms, 1)
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando frame: {str(e)}")


@router.get("/metricas")
async def metricas_latencia():
    """Latencia de procesamiento de los últimos frames (para validar KPIs)."""
    return obtener_metricas()


@router.post("/metricas/reiniciar")
async def reiniciar_metricas_endpoint():
    """Borra las mediciones acumuladas; útil antes de cada corrida de pruebas."""
    reiniciar_metricas()
    return {"mensaje": "Métricas reiniciadas"}