from motor.motor_asyncio import AsyncIOMotorClient
import os

# Tu cadena de conexión directa a MongoDB Atlas
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://sdvg2005_db_user:Sergio2005.*@cluster0.8soead2.mongodb.net/")

client = AsyncIOMotorClient(MONGO_URL)

# Base de datos en la nube
database = client.idss_db

# Colecciones para el sistema de análisis (YOLO / IDSS)
sesiones_collection = database.get_collection("sesiones_analisis")
frames_collection = database.get_collection("frames_analizados")
detecciones_collection = database.get_collection("registros_deteccion")
objetos_collection = database.get_collection("objetos_detectados")

# Colecciones para el nuevo sistema de Autenticación y Registro de usuarios
users_collection = database.get_collection("users")
vehicles_collection = database.get_collection("vehicles")

def get_database():
    return database