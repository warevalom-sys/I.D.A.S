from motor.motor_asyncio import AsyncIOMotorClient
import os

# Tu cadena de conexión directa a MongoDB Atlas
MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://sdvg2005_db_user:Sergio2005.*@cluster0.8soead2.mongodb.net/")

# Cliente asíncrono de MongoDB
client = AsyncIOMotorClient(MONGO_URL)

# Base de datos principal
database = client.idss_db

# Función de dependencia para FastAPI (reemplaza a SessionLocal)
async def get_database():
    return database