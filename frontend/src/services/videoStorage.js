/**
 * IDAS — Almacenamiento local de video (IndexedDB)
 *
 * El video de una sesión NUNCA sube al backend — se queda 100% en el
 * dispositivo (ver SesionAnalisis.video_local_uri en el backend). Se usa
 * IndexedDB en vez de localStorage porque un Blob de video de varios MB
 * no cabe cómodamente en los ~5-10MB de localStorage, y localStorage no
 * está pensado para datos binarios.
 */

const DB_NAME = "idas_videos";
const DB_VERSION = 1;
const STORE_NAME = "videos";

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * URI que se guarda en el backend (SesionAnalisis.video_local_uri) para
 * identificar que el video vive en IndexedDB del navegador, bajo la
 * clave de esta sesión. No es una ruta real de archivo — es solo una
 * referencia para que la propia app sepa dónde buscarlo.
 * @param {number} sesionId
 * @returns {string}
 */
export function claveVideoLocal(sesionId) {
  return `idb://${DB_NAME}/${sesionId}`;
}

/**
 * Guarda un Blob de video en IndexedDB, asociado a una sesión.
 * @param {number} sesionId
 * @param {Blob} blob
 * @returns {Promise<string>} la URI local generada (para pasar a registrarVideoLocal)
 */
export async function guardarVideoLocal(sesionId, blob) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, sesionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  return claveVideoLocal(sesionId);
}

/**
 * Recupera el Blob de video de una sesión, o null si no existe.
 * Usar esto en el futuro reproductor con overlays.
 * @param {number} sesionId
 * @returns {Promise<Blob|null>}
 */
export async function obtenerVideoLocal(sesionId) {
  const db = await abrirDB();
  const blob = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(sesionId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return blob;
}

/**
 * Elimina el video local de una sesión (para liberar espacio en el
 * dispositivo cuando ya no se necesita).
 * @param {number} sesionId
 */
export async function borrarVideoLocal(sesionId) {
  const db = await abrirDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(sesionId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}