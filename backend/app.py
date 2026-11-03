from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos las rutas de tus compañeros
from routes.analizar import router as analizar_router
from routes.auth import router as auth_router

app = FastAPI(
    title="IDSS Backend",
    description="Intelligent Driving Support System",
    version="0.1.0"
)

# Sin credentials=True porque no usamos cookies/sesión — el login devuelve
# el usuario en el body JSON, no vía Set-Cookie. Mezclar "*" con
# allow_credentials=True es inválido según CORS y el navegador puede
# bloquear peticiones en silencio. Si en algún punto migran a cookies de
# sesión, ahí sí hay que cambiar esto a una lista explícita de orígenes.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analizar_router)
app.include_router(auth_router)

@app.get("/")
def root():
    return {"sistema": "IDSS", "version": "0.1.0", "estado": "activo"}

@app.get("/health")
def health():
    return {"status": "ok"}