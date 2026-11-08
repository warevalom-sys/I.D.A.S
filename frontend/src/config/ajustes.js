/**
 * Ajustes del usuario guardados en este dispositivo (localStorage).
 *
 * Los escribe la pantalla Settings y los lee CameraView en cada uso, así un
 * cambio se aplica sin recargar. Son por dispositivo: no se sincronizan con
 * el backend ni entre dispositivos.
 */
const CLAVE = "idas_settings_general"; // misma clave que ya usaba la resolución

export const AJUSTES_POR_DEFECTO = {
  resolucion: "640 × 480", // la resolución con la que se midió la latencia
  camaraTrasera: true,
  sonido: true,
  volumen: 75,
  vibracion: true,
};

export function leerAjustes() {
  try {
    const raw = localStorage.getItem(CLAVE);
    return { ...AJUSTES_POR_DEFECTO, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...AJUSTES_POR_DEFECTO };
  }
}

export function guardarAjustes(parciales) {
  const nuevos = { ...leerAjustes(), ...parciales };
  localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  return nuevos;
}

/** "1280 × 720" -> [1280, 720]; si no se entiende, 640 × 480. */
export function parsearResolucion(texto) {
  const m = /(\d+)\D+(\d+)/.exec(String(texto ?? ""));
  return m ? [Number(m[1]), Number(m[2])] : [640, 480];
}

/** Parámetros de getUserMedia según los ajustes (cámara trasera o frontal y resolución). */
export function restriccionesDeCamara(ajustes = leerAjustes()) {
  const [ancho, alto] = parsearResolucion(ajustes.resolucion);
  return {
    video: {
      facingMode: { ideal: ajustes.camaraTrasera ? "environment" : "user" },
      width: ancho,
      height: alto,
    },
    audio: false,
  };
}

/** Un pitido de 0,3 s. volumen: 0–100 (75 equivale al volumen fijo que se usaba antes). */
export function tono(ctx, volumen = AJUSTES_POR_DEFECTO.volumen) {
  const nivel = Math.max(0, Math.min(100, volumen)) / 100;
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  gain.gain.setValueAtTime(0.4 * nivel, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.3);
}

/**
 * Botón "Probar alerta" de Settings: suena y vibra con los valores que la
 * persona tiene en pantalla (aunque aún no los haya guardado). Se llama desde
 * un toque, por eso el navegador deja crear el audio.
 */
export function probarAlerta(ajustes = leerAjustes()) {
  if (ajustes.sonido && ajustes.volumen > 0) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        ctx.resume?.();
        tono(ctx, ajustes.volumen);
        setTimeout(() => ctx.close?.(), 600);
      }
    } catch (err) {
      console.warn("No se pudo reproducir el sonido de prueba:", err);
    }
  }
  if (ajustes.vibracion) navigator.vibrate?.([200, 100, 200]);
}