/**
 * IDSS — Módulo de comunicación con el backend
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

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
 * @returns {Promise<number>} sesion_id
 */
export async function crearSesion() {
  const res = await fetch(`${BASE_URL}/api/sesiones`, {
    method: "POST",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Error creando sesión: ${res.status}`);
  const data = await res.json();
  return data.sesion_id;
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
 *     area_relativa: number
 *   }>,
 *   total_objetos: number,
 *   nivel_riesgo: "ninguno"|"bajo"|"medio"|"alto",
 *   resolucion_frame: { ancho, alto }
 * }>}
 */
export async function analizarFrame(frameBlob, sesionId) {
  const formData = new FormData();
  formData.append("frame", frameBlob, "frame.jpg");

  const res = await fetch(`${BASE_URL}/api/analizar-frame/${sesionId}`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Error del servidor: ${res.status}`);
  }

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