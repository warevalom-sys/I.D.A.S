from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import Optional
from pydantic import BaseModel

from services.detector import procesar_frame, limpiar_tracking_sesion

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

router = APIRouter(prefix="/api", tags=["Análisis"])


class VideoUpdateRequest(BaseModel):
    video_local_uri: str


class IniciarSesionRequest(BaseModel):
    usuario_id: Optional[int] = None
    vehiculo_id: Optional[int] = None


@router.post("/sesiones")
async def iniciar_sesion(datos: IniciarSesionRequest = IniciarSesionRequest()):
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

    # Libera el historial de tracking en memoria de esta sesión —
    # ya no se van a procesar más frames de ella.
    limpiar_tracking_sesion(sesion_id)

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
    if not obtener_sesion_por_id(sesion_id):
        raise HTTPException(status_code=404, detail="La sesión no existe")
    if not frame.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    try:
        contenido = await frame.read()
        resultado = procesar_frame(contenido, sesion_id)

        if resultado["estado"] == "error":
            raise HTTPException(status_code=422, detail=resultado["mensaje"])

        guardar_frame(sesion_id, resultado)
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando frame: {str(e)}")


@router.post("/analizar-frame/{sesion_id}")
async def analizar_frame(sesion_id: int, frame: UploadFile = File(...)):
    if not obtener_sesion_por_id(sesion_id):
        raise HTTPException(status_code=404, detail="La sesión no existe")
    if not frame.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    try:
        contenido = await frame.read()
        resultado = procesar_frame(contenido, sesion_id)
        guardar_frame(sesion_id, resultado)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando frame: {str(e)}")