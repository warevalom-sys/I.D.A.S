import bcrypt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verificar_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# --- Punto de extensión para autenticación externa (futuro) ---
#
# Cuando se integre login por Google/Microsoft/etc., cada proveedor
# necesita una función que reciba el token que envía el cliente y
# devuelva los datos verificados del usuario (email, nombre, id externo).
# El router de auth.py llama a la función correspondiente según el
# campo "proveedor" que mande el cliente, sin necesitar saber los
# detalles internos de cada proveedor.
#
# Ejemplo de forma que tendría (no implementado todavía):
#
# def verificar_token_google(token: str) -> dict:
#     """Devuelve {"email": ..., "nombre": ..., "proveedor_id": ...}
#     o lanza una excepción si el token no es válido."""
#     ...
#
# VERIFICADORES_OAUTH = {
#     "google": verificar_token_google,
#     # "microsoft": verificar_token_microsoft,
# }