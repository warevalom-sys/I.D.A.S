/**
 * IDSS — Módulo de comunicación con el backend
 *
 * BASE_URL vacío = mismas rutas relativas (/api/...) que el servidor de Vite
 * redirige al backend con el proxy de vite.config.js. Así funciona igual en
 * el PC (localhost) y en el celular (túnel HTTPS), sin CORS y sin editar el
 * .env entre pruebas.
 *
 * Solo define VITE_BACKEND_URL si el backend está en otra máquina y NO usas
 * el proxy (por ejemplo, un backend desplegado).
 */
const BASE_URL = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const TIMEOUT_MS = 5000;
const TIMEOUT_ANALISIS_MS = 8000; // la inferencia de YOLO + red móvil puede tardar más

// ─────────────────────────────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────────────────────────────

/**
 * fetch con timeout y mensajes de error legibles.
 * Un fallo de red del navegador ("Failed to fetch") se convierte en un
 * mensaje que explica qué pasó; los errores HTTP los maneja cada función.
 */
async function fetchApi(ruta, opciones = {}, timeoutMs = TIMEOUT_MS) {
  try {
    return await fetch(`${BASE_URL}${ruta}`, {
      ...opciones,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e?.name === "TimeoutError" || e?.name === "AbortError") {
      throw new Error("El servidor tardó demasiado en responder");
    }
    throw new Error("No se pudo conectar con el servidor. Verifica que el backend esté activo.");
  }
}

/**
 * Extrae un mensaje de error legible de la respuesta de FastAPI.
 * Maneja tanto errores simples (detail: "mensaje") como errores de
 * validación de Pydantic (detail: [{loc, msg, type}, ...]).
 * @param {object} err - body ya parseado como JSON (o {})
 * @param {number} status - código HTTP de la respuesta
 * @param {string} fallback - mensaje genérico si no hay detail
 * @returns {string}
 */
function parsearError(err, status, fallback) {
  if (!err || !err.detail) return `${fallback}: ${status}`;

  // Caso simple: detail es un string
  if (typeof err.detail === "string") return err.detail;

  // Caso Pydantic: detail es un array de objetos {loc, msg, type}
  if (Array.isArray(err.detail)) {
    return err.detail
      .map((e) => {
        const campo = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : "campo";
        return `${campo}: ${e.msg}`;
      })
      .join(" | ");
  }

  return `${fallback}: ${status}`;
}

/** Lanza un Error con el mensaje del backend si la respuesta no es 2xx. */
async function validarRespuesta(res, fallback) {
  if (res.ok) return;
  const err = await res.json().catch(() => ({}));
  throw new Error(parsearError(err, res.status, fallback));
}

const JSON_HEADERS = { "Content-Type": "application/json" };

// ─────────────────────────────────────────────────────────────────
// CONEXIÓN
// ─────────────────────────────────────────────────────────────────

/**
 * Verifica que el backend esté activo.
 * @returns {Promise<boolean>}
 */
export async function verificarConexion() {
  try {
    const res = await fetch(`${BASE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// SESIONES
// ─────────────────────────────────────────────────────────────────

/**
 * Crea una sesión en la BD y retorna su ID entero.
 * Llamar una vez al iniciar el análisis.
 * @param {number} [usuarioId] - opcional mientras no haya login obligatorio
 * @param {number} [vehiculoId] - opcional, solo aplica en modo vehicular con auto registrado
 * @returns {Promise<number>} sesion_id
 */
export async function crearSesion(usuarioId, vehiculoId) {
  const body = {};
  if (usuarioId) body.usuario_id = usuarioId;
  if (vehiculoId) body.vehiculo_id = vehiculoId;

  const res = await fetchApi("/api/sesiones", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  await validarRespuesta(res, "Error creando sesión");
  const data = await res.json();
  return data.sesion_id;
}

/**
 * Marca una sesión como finalizada (estado="finalizada" + fecha_fin).
 * Llamar cuando el usuario termina el recorrido.
 * @param {number} sesionId
 * @returns {Promise<void>}
 */
export async function finalizarSesion(sesionId) {
  const res = await fetchApi(`/api/sesiones/${sesionId}/finalizar`, {
    method: "PATCH",
  });
  await validarRespuesta(res, "Error finalizando sesión");
}

/**
 * Registra que la sesión tiene un video guardado localmente en el
 * dispositivo (el archivo en sí nunca se envía al backend).
 * @param {number} sesionId
 * @param {string} videoLocalUri - ruta/URI del video en el dispositivo
 * @returns {Promise<void>}
 */
export async function registrarVideoLocal(sesionId, videoLocalUri) {
  const res = await fetchApi(`/api/sesiones/${sesionId}/video`, {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ video_local_uri: videoLocalUri }),
  });
  await validarRespuesta(res, "Error registrando video");
}

// ─────────────────────────────────────────────────────────────────
// ANÁLISIS DE FRAMES
// ─────────────────────────────────────────────────────────────────

/**
 * Envía un frame al backend para análisis con YOLOv8.
 * @param {Blob} frameBlob   - Imagen JPEG capturada del video
 * @param {number} sesionId  - ID de la sesión activa en la BD
 * @returns {Promise<{
 *   estado: string,
 *   objetos_detectados: Array<{
 *     clase: string,
 *     confianza: number,
 *     bbox: { x, y, ancho, alto },
 *     posicion_relativa: { x, y },
 *     area_relativa: number,
 *     track_id: number|null,
 *     tasa_expansion: number
 *   }>,
 *   total_objetos: number,
 *   nivel_riesgo: "ninguno"|"bajo"|"medio"|"alto",
 *   resolucion_frame: { ancho, alto },
 *   tiempo_procesamiento_ms: number,
 *   tiempo_inferencia_ms: number
 * }>}
 */
export async function analizarFrame(frameBlob, sesionId) {
  const formData = new FormData();
  formData.append("frame", frameBlob, "frame.jpg");

  const res = await fetchApi(
    `/api/analizar-frame/${sesionId}`,
    { method: "POST", body: formData },
    TIMEOUT_ANALISIS_MS
  );
  await validarRespuesta(res, "Error del servidor");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// FRAMES Y ALERTAS (historial de una sesión)
// ─────────────────────────────────────────────────────────────────

/**
 * Trae los frames analizados de una sesión (para el módulo de Análisis).
 * @param {number} sesionId
 * @returns {Promise<Array<{id, timestamp_frame, ancho, alto, nivel_riesgo, total_objetos}>>}
 */
export async function obtenerFramesDeSesion(sesionId) {
  const res = await fetchApi(`/api/sesiones/${sesionId}/frames`);
  await validarRespuesta(res, "Error obteniendo frames");
  return res.json();
}

/**
 * Trae el historial de alertas reales (riesgo medio/alto) de una sesión —
 * para reproducir el video local con los eventos superpuestos.
 * @param {number} sesionId
 * @returns {Promise<Array<{id, frame_id, fecha, nivel_riesgo, descripcion}>>}
 */
export async function obtenerAlertasDeSesion(sesionId) {
  const res = await fetchApi(`/api/sesiones/${sesionId}/alertas`);
  await validarRespuesta(res, "Error obteniendo alertas");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// MÉTRICAS (validación de KPIs)
// ─────────────────────────────────────────────────────────────────

/**
 * Latencia de procesamiento de los últimos frames (promedio, p95, etc.).
 * @returns {Promise<object>}
 */
export async function obtenerMetricas() {
  const res = await fetchApi("/api/metricas");
  await validarRespuesta(res, "Error obteniendo métricas");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────

/**
 * Registra un usuario nuevo. Si datos.tiene_auto es true, puede incluir
 * datos.vehiculo: {tipo, marca, modelo, anio, placa, color}.
 * @param {{nombre: string, email: string, password: string, modo_preferido?: "ciclista"|"carro", tiene_auto?: boolean, vehiculo?: object}} datos
 * @returns {Promise<{mensaje: string, usuario_id: number, nombre: string, modo_preferido: string, tiene_auto: boolean}>}
 */
export async function registrarUsuario(datos) {
  const res = await fetchApi("/api/auth/registro", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(datos),
  });
  await validarRespuesta(res, "Error registrando usuario");
  return res.json();
}

/**
 * Inicia sesión.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{mensaje: string, usuario_id: number, nombre: string, modo_preferido: string, tiene_auto: boolean}>}
 */
export async function login(email, password) {
  const res = await fetchApi("/api/auth/login", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify({ email, password }),
  });
  await validarRespuesta(res, "Credenciales inválidas");
  return res.json();
}

// ─────────────────────────────────────────────────────────────────
// UTILIDAD — Captura de frame desde <video>
// ─────────────────────────────────────────────────────────────────

/**
 * Convierte un elemento <video> en un Blob JPEG.
 * @param {HTMLVideoElement} videoElement
 * @param {number} calidad - 0.0 a 1.0 (default 0.7)
 * @returns {Promise<Blob>}
 */
export function capturarFrameDeVideo(videoElement, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width  = videoElement.videoWidth  || 640;
    canvas.height = videoElement.videoHeight || 480;
    canvas.getContext("2d").drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo capturar el frame"))),
      "image/jpeg",
      calidad
    );
  });
}