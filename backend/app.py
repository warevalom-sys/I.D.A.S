# app.py  ← mismo archivo, mismo nombre
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import analizar          # ← "routes" no "routers"

app = FastAPI(
    title="IDSS Backend",
    description="Intelligent Driving Support System",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analizar.router)

@app.get("/")
def root():
    return {"sistema": "IDSS", "version": "0.1.0", "estado": "activo"}

@app.get("/health")
def health():
    return {"status": "ok"}