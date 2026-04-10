from fastapi import APIRouter, File, UploadFile, HTTPException
from services.detector import procesar_frame

router = APIRouter(prefix="/api", tags=["Análisis"])

@router.post("/analizar-frame")
async def analizar_frame(frame: UploadFile = File(...)):
    if not frame.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo debe ser una imagen")
    try:
        contenido = await frame.read()
        resultado = procesar_frame(contenido)
        return resultado
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando frame: {str(e)}")

@router.post("/analizar-frame/test")
async def analizar_frame_test():
    return {
        "estado": "ok",
        "objetos_detectados": [],
        "nivel_riesgo": "ninguno",
        "mensaje": "Endpoint activo. Sin frame real procesado."
    }