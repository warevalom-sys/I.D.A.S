from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from services.auth import hash_password, verificar_password
from database.crud import (
    crear_usuario,
    obtener_usuario_por_email,
    obtener_usuario_por_proveedor,
    crear_vehiculo,
)

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])


class VehiculoInput(BaseModel):
    tipo: str = "carro"
    marca: Optional[str] = None
    modelo: Optional[str] = None
    anio: Optional[int] = None
    placa: Optional[str] = None
    color: Optional[str] = None


class RegistroRequest(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    modo_preferido: str = "ciclista"   # "ciclista" | "carro"
    tiene_auto: bool = False
    vehiculo: Optional[VehiculoInput] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginOAuthRequest(BaseModel):
    proveedor: str   # "google", "microsoft", etc.
    token: str       # token que entrega el SDK del proveedor en el cliente


def _respuesta_usuario(usuario, mensaje: str):
    return {
        "mensaje": mensaje,
        "usuario_id": usuario.id,
        "nombre": usuario.nombre,
        "modo_preferido": usuario.modo_preferido,
        "tiene_auto": usuario.tiene_auto,
    }


@router.post("/registro")
async def registrar_usuario(datos: RegistroRequest):
    if await obtener_usuario_por_email(datos.email):
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese email")

    usuario = await crear_usuario(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(datos.password),
        proveedor_auth="local",
        tiene_auto=datos.tiene_auto,
        modo_preferido=datos.modo_preferido,
    )

    if datos.tiene_auto and datos.vehiculo:
        await crear_vehiculo(
            usuario_id=usuario.id,
            tipo=datos.vehiculo.tipo,
            marca=datos.vehiculo.marca,
            modelo=datos.vehiculo.modelo,
            anio=datos.vehiculo.anio,
            placa=datos.vehiculo.placa,
            color=datos.vehiculo.color,
        )

    return _respuesta_usuario(usuario, "Usuario creado correctamente")


@router.post("/login")
async def login(datos: LoginRequest):
    usuario = await obtener_usuario_por_email(datos.email)

    if not usuario or usuario.proveedor_auth != "local" or not usuario.password_hash:
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    if not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

    return _respuesta_usuario(usuario, "Login exitoso")


@router.post("/login/oauth")
async def login_oauth(datos: LoginOAuthRequest):
    """
    Contrato definido para login externo (Google/Microsoft/etc.) — no
    implementado todavía porque requiere credenciales reales del proveedor
    (Client ID, verificación de firma del token, etc.). Cuando se integre:

    1. Buscar en services.auth.VERIFICADORES_OAUTH la función para
       datos.proveedor y usarla para validar datos.token.
    2. Si el usuario ya existe (obtener_usuario_por_proveedor), hacer login.
    3. Si no existe, crearlo con crear_usuario(proveedor_auth=..., proveedor_id=...).
    """
    raise HTTPException(
        status_code=501,
        detail=f"Login por '{datos.proveedor}' aún no está implementado"
    )