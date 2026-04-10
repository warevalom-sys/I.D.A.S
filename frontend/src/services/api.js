/**
 * Módulo de comunicación con el backend IDSS.
 * Centraliza todas las llamadas HTTP para fácil mantenimiento.
 */

const BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

/**
 * Verifica que el backend esté activo.
 * @returns {Promise<boolean>}
 */
export async function verificarConexion() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    console.log("Backend status:", res.ok);
    return res.ok;
  } catch (err) {
    console.error("Backend no disponible:", err);
    return false;
  }
}

/**
 * Envía un frame (Blob o File) al backend para análisis.
 * @param {Blob} frameBlob - Imagen capturada desde el video
 * @returns {Promise<{
 *   estado: string,
 *   objetos_detectados: Array,
 *   total_objetos: number,
 *   nivel_riesgo: string
 * }>}
 */
export async function analizarFrame(frameBlob) {
  const formData = new FormData();
  formData.append("frame", frameBlob, "frame.jpg");

  const response = await fetch(`${BASE_URL}/api/analizar-frame`, {
    method: "POST",
    body: formData,
    signal: AbortSignal.timeout(5000), // timeout 5s
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Error del servidor: ${response.status}`);
  }

  return response.json();
}

/**
 * Convierte un elemento <video> en un Blob JPEG.
 * Usa un canvas temporal para capturar el frame actual.
 * @param {HTMLVideoElement} videoElement
 * @param {number} calidad - 0.0 a 1.0 (default 0.7)
 * @returns {Promise<Blob>}
 */
export function capturarFrameDeVideo(videoElement, calidad = 0.7) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("No se pudo capturar el frame"));
      },
      "image/jpeg",
      calidad
    );
  });
}