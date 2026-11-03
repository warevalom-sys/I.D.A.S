from fastapi import APIRouter, File, UploadFile, HTTPException
from services.detector import procesar_frame

from database.crud import crear_sesion, guardar_frame, obtener_sesion_por_id, obtener_todas_sesiones, obtener_frames_de_sesion

router = APIRouter(prefix="/api", tags=["Análisis"])


@router.post("/sesiones")
async def iniciar_sesion():
    sesion_id = await crear_sesion()
    return {
        "mensaje": "Sesion creada correctamente",
        "sesion_id": sesion_id
    }


@router.get("/sesiones")
async def listar_sesiones():
    return await obtener_todas_sesiones()


@router.get("/sesiones/{sesion_id}/frames")
async def listar_frames(sesion_id: str):
    sesion = await obtener_sesion_por_id(sesion_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="La sesión no existe")
    return await obtener_frames_de_sesion(sesion_id)


@router.post("/analizar-frame/test")
async def analizar_frame_test():
    return {
        "estado": "ok",
        "objetos_detectados": [],
        "nivel_riesgo": "ninguno",
        "mensaje": "Endpoint activo. Sin frame real procesado."
    }


@router.post("/analizar-frame/{sesion_id}")
async def analizar_frame(sesion_id: str, frame: UploadFile = File(...)):
    sesion = await obtener_sesion_por_id(sesion_id)
    if not sesion:
        raise HTTPException(status_code=404, detail="La sesión no existe")
    if not frame.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    try:
        contenido = await frame.read()
        resultado = procesar_frame(contenido)
        await guardar_frame(sesion_id, resultado)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando frame: {str(e)}")