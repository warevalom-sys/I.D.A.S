import os

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./idss.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

# Modo rápido de SQLite (opcional, desactivado por defecto).
# Por defecto SQLite fuerza una escritura física al disco en CADA commit, y
# se guarda un commit por frame. En un disco lento eso domina la latencia.
# Con WAL + synchronous=NORMAL se escribe mucho menos seguido; el costo es que
# ante un corte de luz podrían perderse los últimos frames (aceptable aquí).
#   PowerShell:  $env:IDSS_SQLITE_RAPIDO = 1; uvicorn app:app --port 8000
if os.environ.get("IDSS_SQLITE_RAPIDO", "0") == "1":
    @event.listens_for(engine, "connect")
    def _activar_modo_rapido(dbapi_conexion, _registro):
        cursor = dbapi_conexion.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()