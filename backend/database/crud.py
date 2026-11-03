from database.database import sesiones_collection, frames_collection, users_collection, vehicles_collection
from datetime import datetime
from bson import ObjectId

class UserResponseObj:
    def __init__(self, user_dict):
        self.id = str(user_dict.get("_id"))
        self.nombre = user_dict.get("nombre")
        self.email = user_dict.get("email")
        self.password_hash = user_dict.get("password_hash")
        self.proveedor_auth = user_dict.get("proveedor_auth", "local")
        self.modo_preferido = user_dict.get("modo_preferido", "ciclista")
        self.tiene_auto = user_dict.get("tiene_auto", False)


# --- GESTIÓN DE SESIONES Y FRAMES (YOLO / IDSS) ---

async def crear_sesion():
    nueva_sesion = {
        "fecha_inicio": datetime.utcnow(),
        "estado": "activa"
    }
    resultado = await sesiones_collection.insert_one(nueva_sesion)
    return str(resultado.inserted_id)


async def obtener_sesion_por_id(sesion_id: str):
    try:
        sesion = await sesiones_collection.find_one({"_id": ObjectId(sesion_id)})
        if sesion:
            sesion["id"] = str(sesion["_id"])
            del sesion["_id"]
        return sesion
    except Exception:
        return None


async def guardar_frame(sesion_id: str, resultado: dict):
    # En MongoDB anidamos los objetos detectados directamente en el documento del frame
    objetos_lista = []
    for obj in resultado.get("objetos_detectados", []):
        objetos_lista.append({
            "clase": obj["clase"],
            "confianza": obj["confianza"],
            "bbox_x": obj["bbox"]["x"],
            "bbox_y": obj["bbox"]["y"],
            "bbox_ancho": obj["bbox"]["ancho"],
            "bbox_alto": obj["bbox"]["alto"],
            "pos_rel_x": obj["posicion_relativa"]["x"],
            "pos_rel_y": obj["posicion_relativa"]["y"],
            "area_relativa": obj["area_relativa"]
        })

    frame_doc = {
        "sesion_id": sesion_id,
        "timestamp_frame": datetime.utcnow(),
        "ancho": resultado["resolucion_frame"]["ancho"],
        "alto": resultado["resolucion_frame"]["alto"],
        "nivel_riesgo": resultado["nivel_riesgo"],
        "total_objetos": resultado["total_objetos"],
        "objetos": objetos_lista
    }

    await frames_collection.insert_one(frame_doc)


async def obtener_todas_sesiones():
    cursor = sesiones_collection.find().sort("fecha_inicio", -1)
    sesiones = []
    async for s in cursor:
        sesiones.append({
            "id": str(s["_id"]),
            "fecha_inicio": s["fecha_inicio"].isoformat() if s.get("fecha_inicio") else None,
            "estado": s.get("estado", "activa")
        })
    return sesiones


async def obtener_frames_de_sesion(sesion_id: str):
    cursor = frames_collection.find({"sesion_id": sesion_id}).sort("timestamp_frame", -1)
    frames = []
    async for f in cursor:
        frames.append({
            "id": str(f["_id"]),
            "timestamp_frame": f["timestamp_frame"].isoformat() if f.get("timestamp_frame") else None,
            "ancho": f["ancho"],
            "alto": f["alto"],
            "nivel_riesgo": f["nivel_riesgo"],
            "total_objetos": f["total_objetos"],
            "objetos": f.get("objetos", [])
        })
    return frames


# --- GESTIÓN DE USUARIOS Y AUTENTICACIÓN ---

async def obtener_usuario_por_email(email: str):
    user_doc = await users_collection.find_one({"email": email})
    if not user_doc:
        return None
    return UserResponseObj(user_doc)


async def obtener_usuario_por_proveedor(proveedor: str, proveedor_id: str):
    user_doc = await users_collection.find_one({"proveedor_auth": proveedor, "proveedor_id": proveedor_id})
    if not user_doc:
        return None
    return UserResponseObj(user_doc)


async def crear_usuario(nombre: str, email: str, password_hash: str, proveedor_auth: str = "local", tiene_auto: bool = False, modo_preferido: str = "ciclista", proveedor_id: str = None):
    user_data = {
        "nombre": nombre,
        "email": email,
        "password_hash": password_hash,
        "proveedor_auth": proveedor_auth,
        "proveedor_id": proveedor_id,
        "tiene_auto": tiene_auto,
        "modo_preferido": modo_preferido,
        "fecha_creacion": datetime.utcnow()
    }
    result = await users_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return UserResponseObj(user_data)


async def crear_vehiculo(usuario_id: str, tipo: str, marca: str = None, modelo: str = None, anio: int = None, placa: str = None, color: str = None):
    vehiculo_data = {
        "usuario_id": ObjectId(usuario_id) if ObjectId.is_valid(usuario_id) else usuario_id,
        "tipo": tipo,
        "marca": marca,
        "modelo": modelo,
        "anio": anio,
        "placa": placa,
        "color": color,
        "fecha_registro": datetime.utcnow()
    }
    result = await vehicles_collection.insert_one(vehiculo_data)
    return str(result.inserted_id)