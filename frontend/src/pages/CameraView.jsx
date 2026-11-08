import { useRef, useState, useEffect, useCallback } from "react";
import { ROUTES } from "../Routes";
import {
  analizarFrame,
  capturarFrameDeVideo,
  verificarConexion,
  crearSesion,
  finalizarSesion,
  registrarVideoLocal,
} from "../services/api";
import { guardarVideoLocal } from "../services/videoStorage";
import VehicleIcon from "../components/VehicleIcon";
import { tr } from "../config/perfiles";
import { leerAjustes, restriccionesDeCamara, tono } from "../config/ajustes";
import "../styles/camera.css";

const INTERVALO_MS = 750;

const RIESGO_CONFIG = {
  ninguno: { color: "#3ecf6e", width: "0%",   labelKey: "camera.risk.ninguno" },
  bajo:    { color: "#ffc93c", width: "30%",  labelKey: "camera.risk.bajo" },
  medio:   { color: "#ff9f43", width: "65%",  labelKey: "camera.risk.medio" },
  alto:    { color: "#ff4d4f", width: "100%", labelKey: "camera.risk.alto" },
};

const MODE_CONFIG = {
  vehicular: {
    titleKey: "camera.mode.vehicular.title",
    icon: "◻",
    descKey: "camera.mode.vehicular.desc",
    usaCamera: false,
    usaVideo: true,
  },
  video: {
    titleKey: "camera.mode.video.title",
    icon: "◫",
    descKey: "camera.mode.video.desc",
    usaCamera: false,
    usaVideo: true,
  },
  bicicleta: {
    titleKey: "camera.mode.bicicleta.title",
    icon: "◎",
    descKey: "camera.mode.bicicleta.desc",
    usaCamera: true,
    usaVideo: false,
  },
};

/**
 * El backend decide CUÁNDO suena la alerta (política en services/alerta.py y
 * campo alerta_sonora de la respuesta). Si el servidor aún no envía el campo,
 * se usa el comportamiento anterior: sonar cuando el riesgo es alto.
 */
const debeSonar = (resultado) =>
  typeof resultado.alerta_sonora === "boolean"
    ? resultado.alerta_sonora
    : resultado.nivel_riesgo === "alto";

export default function CameraView({ mode, navigate, onSesionUpdate, user, t = (key) => key }) {
  const cfgMeta = MODE_CONFIG[mode] || MODE_CONFIG.vehicular;
  const cfg = { ...cfgMeta, title: t(cfgMeta.titleKey), desc: t(cfgMeta.descKey) };

  // En bicicleta se prioriza no distraer visualmente al usuario — el sonido
  // ya carga la alerta. Vehicular/video sí muestran el feed completo con
  // bounding boxes, borde de alerta y píldora de riesgo.
  const feedVisualCompleto = mode !== "bicicleta";

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const intervaloRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const sesionIdRef  = useRef(null);
  const sesionFinalizadaRef = useRef(false);
  const creandoSesionRef = useRef(null);   // evita crear dos sesiones con doble clic
  const enVueloRef = useRef(false);        // hay un frame en camino al backend
  const erroresSeguidosRef = useRef(0);
  const analisisActivoRef = useRef(false); // descarta respuestas que llegan tras pausar
  const alertasRef = useRef(0);            // episodios de riesgo alto de esta sesión
  const ultimoNivelRef = useRef(null);
  const wakeLockRef = useRef(null);        // mantiene la pantalla encendida
  const videoUrlRef = useRef(null);

  // Grabación local del video (MediaRecorder) — el video nunca sube al
  // backend, se guarda 100% en el dispositivo vía IndexedDB.
  const mediaRecorderRef = useRef(null);
  const chunksVideoRef   = useRef([]);

  const [camaraActiva,     setCamaraActiva]     = useState(false);
  const [sesionId,         setSesionId]         = useState(null);
  const [analizando,       setAnalizando]       = useState(false);
  const [backendConectado, setBackendConectado] = useState(false);
  const [resultadoActual,  setResultadoActual]  = useState(null);
  const [fps,              setFps]              = useState("—");
  const [error,            setError]            = useState(null);
  const [videoUrl,         setVideoUrl]         = useState(null);

  useEffect(() => {
    verificarConexion().then(setBackendConectado);
  }, []);

  /**
   * Devuelve la sesión activa; si no hay (o ya se finalizó), crea una nueva.
   * Se llama al iniciar la cámara / el análisis, no al abrir la pantalla:
   * así no quedan sesiones "activas" vacías ni duplicadas.
   */
  const asegurarSesion = useCallback(async () => {
    if (sesionIdRef.current && !sesionFinalizadaRef.current) return sesionIdRef.current;
    if (!creandoSesionRef.current) {
      creandoSesionRef.current = crearSesion(user?.usuarioId)
        .then((id) => {
          sesionIdRef.current = id;
          sesionFinalizadaRef.current = false;
          alertasRef.current = 0;
          ultimoNivelRef.current = null;
          setSesionId(id);
          return id;
        })
        .finally(() => { creandoSesionRef.current = null; });
    }
    return creandoSesionRef.current;
  }, [user?.usuarioId]);

  const finalizarSesionActual = useCallback(async () => {
    if (!sesionIdRef.current || sesionFinalizadaRef.current) return;
    sesionFinalizadaRef.current = true;
    try {
      await finalizarSesion(sesionIdRef.current);
    } catch (err) {
      console.error("Error finalizando sesión:", err);
    }
  }, []);

  // ── Grabación local del video ──────────────────────────
  const elegirMimeType = () => {
    if (typeof MediaRecorder === "undefined") return "";
    const candidatos = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm",
      "video/mp4",
    ];
    return candidatos.find((tipo) => MediaRecorder.isTypeSupported(tipo)) || "";
  };

  /**
   * Inicia la grabación del stream de la cámara. No usa el stream del
   * <video> (que puede tener transformaciones de reproducción), sino el
   * MediaStream original que ya devolvió getUserMedia.
   */
  const iniciarGrabacion = useCallback((stream) => {
    if (typeof MediaRecorder === "undefined") {
      console.warn("MediaRecorder no está disponible en este navegador — no se grabará video local.");
      return;
    }

    chunksVideoRef.current = [];
    const sesionGrabacion = sesionIdRef.current; // la sesión puede cambiar antes de que termine de guardarse
    const mimeType = elegirMimeType();

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksVideoRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const sesion = sesionGrabacion || sesionIdRef.current;
        const chunks = chunksVideoRef.current;
        chunksVideoRef.current = [];

        if (!sesion || chunks.length === 0) return;

        const blob = new Blob(chunks, { type: mimeType || "video/webm" });

        try {
          const uri = await guardarVideoLocal(sesion, blob);
          await registrarVideoLocal(sesion, uri);
          console.log("Video local guardado:", uri, `(${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
        } catch (err) {
          // No interrumpe el flujo del usuario — solo se pierde el video,
          // el análisis y las alertas ya quedaron guardados igual.
          console.error("Error guardando video local:", err);
        }
      };

      recorder.onerror = (e) => {
        console.error("Error del MediaRecorder:", e.error);
      };

      // timeslice de 1s: entrega chunks periódicamente en vez de un solo
      // blob al final, para no perder toda la grabación si algo falla
      // a medio camino.
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error("No se pudo iniciar la grabación local:", err);
    }
  }, []);

  const detenerGrabacion = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop(); // dispara onstop de forma asíncrona
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(intervaloRef.current);
      detenerGrabacion(); // red de seguridad si se desmonta con la cámara activa
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current);
      liberarPantallaActiva();
      audioCtxRef.current?.close?.();
      audioCtxRef.current = null;
      finalizarSesionActual();
    };
  }, []);

  // ── Alertas sonoras ───────────────────────────────────
  // El navegador solo deja sonar el audio si el AudioContext se crea o se
  // reanuda dentro de un toque del usuario (iOS Safari y Chrome móvil lo
  // exigen). Por eso se "desbloquea" al pulsar Iniciar cámara / Analizar y
  // se reutiliza el mismo contexto durante toda la sesión.
  const desbloquearAudio = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    } catch (err) {
      console.warn("No se pudo activar el audio:", err);
    }
  }, []);

  // Un pitido (y una vibración) por cada respuesta con alerta_sonora = true.
  // Cuántos pitidos suenan y cuándo se callan lo decide el backend; si suena,
  // cuánto y si vibra lo deciden los ajustes (se leen en cada alerta, así los
  // cambios de Settings se aplican al instante).
  const emitirPitido = useCallback(() => {
    const ajustes = leerAjustes();
    if (ajustes.sonido && ajustes.volumen > 0) {
      desbloquearAudio();
      const ctx = audioCtxRef.current;
      if (ctx && ctx.state !== "closed") tono(ctx, ajustes.volumen);
    }
    // Vibración (solo Android; iOS no la soporta)
    if (ajustes.vibracion) navigator.vibrate?.([200, 100, 200]);
  }, [desbloquearAudio]);

  // ── Pantalla encendida ────────────────────────────────
  // Si el celular apaga la pantalla en pleno recorrido, la cámara se detiene
  // y el sistema deja de proteger. Requiere HTTPS (el túnel) o localhost.
  const pedirPantallaActiva = useCallback(async () => {
    try {
      if (!("wakeLock" in navigator) || wakeLockRef.current) return;
      const lock = await navigator.wakeLock.request("screen");
      wakeLockRef.current = lock;
      lock.addEventListener?.("release", () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
      });
    } catch (err) {
      console.warn("No se pudo mantener la pantalla encendida:", err);
    }
  }, []);

  const liberarPantallaActiva = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    Promise.resolve(lock?.release?.()).catch(() => {});
  }, []);

  // El navegador suelta el bloqueo al ocultar la pestaña; se pide de nuevo al volver.
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === "visible" &&
          (analisisActivoRef.current || videoRef.current?.srcObject)) {
        pedirPantallaActiva();
      }
    };
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, [pedirPantallaActiva]);

  useEffect(() => {
    if (!resultadoActual) return;
    const esAlto = resultadoActual.nivel_riesgo === "alto";
    onSesionUpdate?.({
      modo: mode,
      objetosDetectados: resultadoActual.total_objetos,
      alertas: alertasRef.current,
      fps: fps,
      estado: analizando ? (esAlto ? "riesgoAlto" : "analizando") : "pausado",
      nivelRiesgo: resultadoActual.nivel_riesgo,
    });
  }, [resultadoActual, analizando, fps]);

  // ── Análisis ──────────────────────────────────────────
  const dibujarDetecciones = useCallback((objetos) => {
    if (!feedVisualCompleto) return; // bicicleta: no se dibuja nada sobre el video
    const canvas = canvasRef.current;
    const video  = videoRef.current;
    if (!canvas || !video) return;

    // Las coordenadas del backend están en el tamaño real del video, pero el
    // video se muestra con object-fit: cover (recortado). Se convierten a la
    // zona visible para que los recuadros queden sobre los objetos.
    const vw = video.videoWidth  || 640;
    const vh = video.videoHeight || 480;
    const cw = canvas.clientWidth  || vw;
    const ch = canvas.clientHeight || vh;
    canvas.width  = cw;
    canvas.height = ch;

    const escala = Math.max(cw / vw, ch / vh);
    const offX = (cw - vw * escala) / 2;
    const offY = (ch - vh * escala) / 2;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, cw, ch);

    objetos.forEach((obj) => {
      const { x, y, ancho, alto } = obj.bbox;
      const bx = x * escala + offX;
      const by = y * escala + offY;
      const bw = ancho * escala;
      const bh = alto * escala;
      const color = obj.clase === "persona" ? "#378add" : "#ff9f43";

      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(bx, by, bw, bh);

      const yEtiqueta = by < 20 ? by : by - 20; // no se sale por arriba
      ctx.fillStyle = color;
      ctx.fillRect(bx, yEtiqueta, bw, 20);
      ctx.fillStyle = "#0c0d0f";
      ctx.font      = "600 11px Barlow, sans-serif";
      ctx.fillText(`${obj.clase} ${Math.round(obj.confianza * 100)}%`, bx + 4, yEtiqueta + 15);
    });
  }, [feedVisualCompleto]);

  const detenerAnalisis = useCallback(() => {
    analisisActivoRef.current = false;
    clearInterval(intervaloRef.current);
    setAnalizando(false);
    // Solo se pausa un video cargado. La cámara en vivo sigue corriendo:
    // si se pausara, al reanudar se analizaría un frame congelado.
    if (cfg.usaVideo && videoRef.current) videoRef.current.pause();
    const canvas = canvasRef.current;
    canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }, [cfg.usaVideo]);

  const iniciarAnalisis = useCallback(async () => {
    if (!backendConectado) return;
    desbloquearAudio(); // dentro del toque del usuario, antes de cualquier await

    try {
      await asegurarSesion();
    } catch (err) {
      console.error("Error creando sesión:", err);
      setError(err.message);
      return;
    }

    setError(null);
    pedirPantallaActiva();
    if (videoRef.current?.paused) videoRef.current.play().catch(() => {});

    clearInterval(intervaloRef.current);
    analisisActivoRef.current = true;
    enVueloRef.current = false;
    erroresSeguidosRef.current = 0;
    setAnalizando(true);
    let ultimoTiempo = Date.now();

    intervaloRef.current = setInterval(async () => {
      // Un frame a la vez: si el anterior sigue en camino (red lenta o
      // servidor ocupado) se salta este turno en vez de acumular peticiones.
      if (enVueloRef.current) return;
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (!sesionIdRef.current) return;

      enVueloRef.current = true;
      try {
        const blob      = await capturarFrameDeVideo(videoRef.current);
        const resultado = await analizarFrame(blob, sesionIdRef.current);
        if (!analisisActivoRef.current) return; // se pausó mientras esperaba

        erroresSeguidosRef.current = 0;
        setBackendConectado(true);
        setResultadoActual(resultado);

        // Un episodio de alerta = paso de "no alto" a "alto"
        if (resultado.nivel_riesgo === "alto" && ultimoNivelRef.current !== "alto") {
          alertasRef.current += 1;
        }
        ultimoNivelRef.current = resultado.nivel_riesgo;

        if (debeSonar(resultado)) emitirPitido();

        const ahora = Date.now();
        setFps(Math.round(1000 / (ahora - ultimoTiempo)));
        ultimoTiempo = ahora;

        dibujarDetecciones(resultado.objetos_detectados);
      } catch (err) {
        if (!analisisActivoRef.current) return; // error de un frame que viajaba al pausar o detener
        if (/finalizada/i.test(err.message)) {
          // El servidor cerró esta sesión (inactividad o reinicio): se abre
          // una nueva y el análisis sigue sin que el usuario tenga que hacer nada.
          sesionFinalizadaRef.current = true;
          try {
            await asegurarSesion();
          } catch (e) {
            console.error("Error creando sesión nueva:", e);
          }
          return;
        }
        console.error("Error enviando frame:", err);
        erroresSeguidosRef.current += 1;
        // Tras 3 fallos seguidos se avisa que el sistema no está protegiendo
        if (erroresSeguidosRef.current >= 3) setBackendConectado(false);
      } finally {
        enVueloRef.current = false;
      }
    }, INTERVALO_MS);
  }, [backendConectado, dibujarDetecciones, asegurarSesion, desbloquearAudio, emitirPitido, pedirPantallaActiva]);

  // ── Cámara ────────────────────────────────────────────
  const iniciarCamara = async () => {
    desbloquearAudio(); // dentro del toque del usuario
    try {
      setError(null);
      // Cámara trasera/frontal y resolución según los ajustes guardados
      const stream = await navigator.mediaDevices.getUserMedia(restriccionesDeCamara(leerAjustes()));
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCamaraActiva(true);
        pedirPantallaActiva();
        try {
          await asegurarSesion(); // para asociar la grabación a su sesión
        } catch (err) {
          console.error("Error creando sesión:", err); // se reintenta al iniciar el análisis
        }
        iniciarGrabacion(stream);
      }
    } catch (err) {
      setError(t("camera.cameraError") + err.message);
    }
  };

  const detenerCamara = () => {
    detenerAnalisis();
    detenerGrabacion();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
    setResultadoActual(null);
    setFps("—");
    liberarPantallaActiva();
    finalizarSesionActual();
  };

  // ── Video ─────────────────────────────────────────────
  const cargarVideo = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    detenerAnalisis();
    finalizarSesionActual(); // el video anterior cierra su sesión
    setResultadoActual(null);
    setFps("—");
    const url = URL.createObjectURL(archivo);
    videoUrlRef.current = url;
    setVideoUrl(url);
  };

  const reproducirYAnalizar = () => {
    if (!videoRef.current || !videoUrl) return;
    desbloquearAudio();
    videoRef.current.play();
    iniciarAnalisis();
  };

  const detenerVideo = () => {
    detenerAnalisis();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setResultadoActual(null);
    setFps("—");
    liberarPantallaActiva();
    finalizarSesionActual();
  };

  // ── UI ────────────────────────────────────────────────
  const riesgoKey = resultadoActual?.nivel_riesgo || "ninguno";
  const riesgoMeta = RIESGO_CONFIG[riesgoKey];
  const riesgo    = { ...riesgoMeta, label: t(riesgoMeta.labelKey) };

  const alertaRiesgoAlto = () =>
    feedVisualCompleto && analizando && resultadoActual?.nivel_riesgo === "alto" ? (
      <div style={{
        position: "absolute", inset: 0,
        border: "4px solid #ff4d4f",
        borderRadius: 6,
        animation: "parpadeo 0.5s infinite",
        pointerEvents: "none",
        zIndex: 10,
      }}>
        <div style={{
          position: "absolute", top: 12,
          left: "50%", transform: "translateX(-50%)",
          background: "#ff4d4f", color: "#4a1111",
          fontWeight: 600, fontSize: "0.95rem",
          padding: "6px 20px", borderRadius: 24,
          whiteSpace: "nowrap",
        }}>
          {t("camera.alertHighRisk")}
        </div>
      </div>
    ) : null;

  const badgeBackend = () => backendConectado
    ? <div className="feed-badge" style={{ color: "#3ecf6e" }}>{t("camera.backendConnected")}</div>
    : <div className="feed-badge" style={{ color: "#ff4d4f" }}>{t("camera.backendUnavailable")}</div>;

  // Píldora de riesgo flotante — solo en modos con feed visual completo.
  // En bicicleta, la alerta sonora es la única señal (ver emitirPitido).
  const riesgoFlotante = () => (
    <div className="cv-feed-risk-badge">
      <div className="cv-feed-risk-badge-inner" style={{ color: riesgo.color, background: `${riesgo.color}1a` }}>
        <span className="cv-feed-risk-dot" />
        {riesgo.label}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────
  const esBici = cfg.usaCamera;
  const tipoIcono = esBici ? "bicicleta" : user?.tipoVehiculo === "motocicleta" ? "motocicleta" : "carro";
  const listo = esBici ? camaraActiva : !!videoUrl;

  const estadoTexto = analizando
    ? tr(t, "camera.ui.state.analyzing", "Analizando tu entorno")
    : listo
      ? tr(t, "camera.ui.state.ready", "Todo listo, falta iniciar el análisis")
      : esBici
        ? tr(t, "camera.ui.state.needCamera", "Activa la cámara para empezar")
        : tr(t, "camera.ui.state.needVideo", "Carga un video para empezar");

  // Una sola acción principal a la vez: la que toca ahora.
  let accion;
  if (analizando) {
    accion = { label: t("camera.controls.pauseAnalysis"), onClick: detenerAnalisis, variant: "pause" };
  } else if (listo) {
    accion = {
      label: esBici ? t("camera.controls.startAnalysis") : t("camera.controls.analyze"),
      onClick: esBici ? iniciarAnalisis : reproducirYAnalizar,
      disabled: !backendConectado,
      variant: "primary",
    };
  } else {
    accion = {
      label: esBici ? t("camera.controls.startCamera") : t("camera.controls.loadVideo"),
      onClick: esBici ? iniciarCamara : () => fileInputRef.current.click(),
      variant: "primary",
    };
  }

  const pasos = [
    { label: esBici ? tr(t, "camera.ui.step.camera", "Cámara") : tr(t, "camera.ui.step.video", "Video"), done: listo },
    { label: tr(t, "camera.ui.step.analysis", "Análisis"), done: analizando },
  ];
  const pasoActual = pasos.findIndex((p) => !p.done);

  const placeholderTitulo = esBici
    ? tr(t, "camera.ui.placeholder.camera", "Activa la cámara para empezar")
    : tr(t, "camera.ui.placeholder.video", "Carga un video para empezar");

  return (
    <div className="camera-view cv2">
      <header className="cv2-header">
        <div className="cv2-title">
          <span className="cv2-title-icon"><VehicleIcon tipo={tipoIcono} size={26} /></span>
          <div>
            <h1 className="cv2-h1">{cfg.title}</h1>
            <p className="cv2-sub" aria-live="polite">{estadoTexto}</p>
          </div>
        </div>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>{t("settings.back")}</button>
      </header>

      <div className="cv2-layout">

        {/* ── FEED ── */}
        <div className="cv-feed cv2-feed">

          {/* ── MODO VIDEO ── */}
          {cfg.usaVideo && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                style={{ display: "none" }}
                onChange={cargarVideo}
              />

              {!videoUrl && (
                <div className="cv2-placeholder">
                  <span className="cv2-ph-icon"><VehicleIcon tipo={tipoIcono} size={40} /></span>
                  <p className="cv2-ph-title">{placeholderTitulo}</p>
                  <p className="cv2-ph-desc">{cfg.desc}</p>
                  {badgeBackend()}
                </div>
              )}

              <video
                ref={videoRef}
                src={videoUrl || undefined}
                muted
                playsInline
                controls={false}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  display: videoUrl ? "block" : "none",
                }}
                onEnded={() => { detenerAnalisis(); finalizarSesionActual(); }}
              />

              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  pointerEvents: "none",
                  display: videoUrl ? "block" : "none",
                }}
              />
              {alertaRiesgoAlto()}
              {videoUrl && riesgoFlotante()}
            </div>
          )}

          {/* ── MODO CÁMARA (bicicleta) ── */}
          {cfg.usaCamera && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {!camaraActiva && (
                <div className="cv2-placeholder">
                  <span className="cv2-ph-icon"><VehicleIcon tipo={tipoIcono} size={40} /></span>
                  <p className="cv2-ph-title">{placeholderTitulo}</p>
                  <p className="cv2-ph-desc">{cfg.desc}</p>
                  {badgeBackend()}
                </div>
              )}

              <video
                ref={videoRef}
                muted
                playsInline
                controls={false}
                style={{
                  width: "100%", height: "100%",
                  objectFit: "cover",
                  display: camaraActiva ? "block" : "none",
                }}
              />

              {/* En bicicleta no se dibuja el canvas — dibujarDetecciones()
                  ya no hace nada en este modo, pero se mantiene el elemento
                  oculto por si en algún punto quieren reactivarlo. */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  pointerEvents: "none",
                  display: feedVisualCompleto && camaraActiva ? "block" : "none",
                }}
              />

              {alertaRiesgoAlto()}
              {feedVisualCompleto && camaraActiva && riesgoFlotante()}

              {/* En bicicleta, mientras está activa, un indicador mínimo
                  y calmado — sin parpadeo, sin bounding boxes. */}
              {!feedVisualCompleto && camaraActiva && (
                <div className="cv-feed-bici-status" style={{
                  position: "absolute", bottom: 12, left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(13,17,23,0.85)",
                  color: riesgo.color,
                  padding: "6px 16px", borderRadius: 20,
                  fontSize: "0.8rem", fontWeight: 600,
                }}>
                  {analizando ? riesgo.label : t("camera.paused")}
                </div>
              )}

              {error && (
                <div style={{
                  position: "absolute", bottom: 8, left: 8, right: 8,
                  background: "#4a1111", color: "#ff9f9f",
                  padding: "0.5rem", borderRadius: 6, fontSize: "0.8rem"
                }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {feedVisualCompleto && (
            <div className="feed-overlay-info">
              <span>IDAS — {cfg.title}</span>
              <span>FPS: {fps}</span>
            </div>
          )}
        </div>

        {/* ── PANEL LATERAL ── */}
        <div className="cv2-side">

          {/* Pasos */}
          <ol className="cv2-steps" aria-label={tr(t, "camera.ui.steps", "Pasos")}>
            {pasos.map((p, i) => (
              <li
                key={p.label}
                className={`cv2-step${p.done ? " done" : ""}${i === pasoActual ? " current" : ""}`}
              >
                <span className="cv2-step-num">{p.done ? "✓" : i + 1}</span>
                {p.label}
              </li>
            ))}
          </ol>

          {/* Sin conexión con el servidor */}
          {!backendConectado && (
            <div className="cv2-warn" role="alert">
              <span>{t("camera.backendUnavailable")}</span>
              <button className="cv2-link" onClick={() => verificarConexion().then(setBackendConectado)}>
                {tr(t, "camera.ui.retry", "Reintentar")}
              </button>
            </div>
          )}

          {!esBici && error && (
            <div className="cv2-warn" role="alert"><span>{error}</span></div>
          )}

          {/* Acción principal + terminar */}
          <div className="cv2-actions">
            <button
              className={`cv2-btn cv2-btn-${accion.variant}`}
              onClick={accion.onClick}
              disabled={accion.disabled}
            >
              {accion.label}
            </button>

            {!esBici && videoUrl && !analizando && (
              <button className="cv2-btn cv2-btn-ghost" onClick={() => fileInputRef.current.click()}>
                {tr(t, "camera.ui.changeVideo", "Cambiar video")}
              </button>
            )}

            <button
              className="cv2-btn cv2-btn-danger"
              onClick={esBici ? detenerCamara : detenerVideo}
              disabled={!listo}
            >
              {esBici ? t("camera.controls.stopCamera") : t("camera.controls.stopVideo")}
            </button>
          </div>

          {/* Nivel de riesgo (siempre visible, también en móvil) */}
          <section className="cv2-risk" aria-live="polite">
            <div className="cv2-risk-head">
              <span className="cv2-risk-title">{t("camera.riskIndicator.title")}</span>
              <span className="cv2-risk-label" style={{ color: riesgo.color }}>{riesgo.label}</span>
            </div>
            <div className="cv2-risk-bar">
              <div
                className="cv2-risk-fill"
                style={{ width: riesgo.width, background: riesgo.color }}
              />
            </div>
            {esBici && (
              <p className="cv2-risk-note">
                {tr(t, "camera.ui.soundNote", "Las alertas se avisan con sonido. Sube el volumen antes de salir.")}
              </p>
            )}
            {feedVisualCompleto && resultadoActual?.total_objetos > 0 && (
              <ul className="cv2-objects">
                {resultadoActual.objetos_detectados.map((obj, i) => (
                  <li key={i}>
                    {obj.clase} — {Math.round(obj.confianza * 100)}% {t("camera.confidence")}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="cv2-safety">
            {tr(t, "camera.ui.safety", "Configura todo antes de salir. No uses el celular mientras te desplazas.")}
          </p>
        </div>
      </div>

      <div className="disclaimer">
        {cfg.usaCamera ? t("camera.disclaimer.visual") : t("camera.disclaimer.pending")}
      </div>
    </div>
  );
}