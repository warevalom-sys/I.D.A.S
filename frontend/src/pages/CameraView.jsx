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
  const sonandoRef   = useRef(false);
  const sesionIdRef  = useRef(null);
  const sesionFinalizadaRef = useRef(false);

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

  useEffect(() => {
    const initSesion = async () => {
      try {
        const id = await crearSesion(user?.usuarioId);
        setSesionId(id);
        sesionIdRef.current = id;
        sesionFinalizadaRef.current = false;
        console.log("Sesion creada:", id);
      } catch (err) {
        console.error("Error creando sesión:", err);
      }
    };
    initSesion();
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
    const mimeType = elegirMimeType();

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksVideoRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const sesion = sesionIdRef.current;
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
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      detenerAlerta();
      finalizarSesionActual();
    };
  }, []);

  // ── Alertas sonoras ───────────────────────────────────
  const reproducirAlerta = useCallback(() => {
    if (sonandoRef.current) return;
    sonandoRef.current = true;

    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtxRef.current = ctx;

    const intervalo = setInterval(() => {
      if (!sonandoRef.current) {
        clearInterval(intervalo);
        return;
      }
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }, 600);
  }, []);

  const detenerAlerta = useCallback(() => {
    sonandoRef.current = false;
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (resultadoActual?.nivel_riesgo === "alto") {
      reproducirAlerta();
    } else {
      detenerAlerta();
    }
  }, [resultadoActual?.nivel_riesgo]);

  useEffect(() => {
    if (!resultadoActual) return;
    const esAlto = resultadoActual.nivel_riesgo === "alto";
    onSesionUpdate?.({
      modo: mode,
      objetosDetectados: resultadoActual.total_objetos,
      alertas: esAlto ? 1 : 0,
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

    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objetos.forEach((obj) => {
      const { x, y, ancho, alto } = obj.bbox;
      const color = obj.clase === "persona" ? "#378add" : "#ff9f43";

      ctx.strokeStyle = color;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x, y, ancho, alto);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, ancho, 20);
      ctx.fillStyle = "#0c0d0f";
      ctx.font      = "600 11px Barlow, sans-serif";
      ctx.fillText(`${obj.clase} ${Math.round(obj.confianza * 100)}%`, x + 4, y - 5);
    });
  }, [feedVisualCompleto]);

  const detenerAnalisis = useCallback(() => {
    clearInterval(intervaloRef.current);
    setAnalizando(false);
    if (videoRef.current) videoRef.current.pause();
    detenerAlerta();
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [detenerAlerta]);

  const iniciarAnalisis = useCallback(() => {
    if (!backendConectado) return;
    setAnalizando(true);
    let ultimoTiempo = Date.now();

    intervaloRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      if (!sesionIdRef.current) return;
      try {
        const blob      = await capturarFrameDeVideo(videoRef.current);
        const resultado = await analizarFrame(blob, sesionIdRef.current);
        setResultadoActual(resultado);

        const ahora = Date.now();
        setFps(Math.round(1000 / (ahora - ultimoTiempo)));
        ultimoTiempo = ahora;

        dibujarDetecciones(resultado.objetos_detectados);
      } catch (err) {
        console.error("Error enviando frame:", err);
      }
    }, INTERVALO_MS);
  }, [backendConectado, dibujarDetecciones]);

  // ── Cámara ────────────────────────────────────────────
  const iniciarCamara = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCamaraActiva(true);
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
    finalizarSesionActual();
  };

  // ── Video ─────────────────────────────────────────────
  const cargarVideo = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    detenerAnalisis();
    setResultadoActual(null);
    setFps("—");
    const url = URL.createObjectURL(archivo);
    setVideoUrl(url);
  };

  const reproducirYAnalizar = () => {
    if (!videoRef.current || !videoUrl) return;
    videoRef.current.play();
    iniciarAnalisis();
  };

  const detenerVideo = () => {
    detenerAnalisis();
    if (videoRef.current) videoRef.current.currentTime = 0;
    setResultadoActual(null);
    setFps("—");
    finalizarSesionActual();
  };

  // ── UI ────────────────────────────────────────────────
  const riesgoKey = resultadoActual?.nivel_riesgo || "ninguno";
  const riesgoMeta = RIESGO_CONFIG[riesgoKey];
  const riesgo    = { ...riesgoMeta, label: t(riesgoMeta.labelKey) };

  const AlertaRiesgoAlto = () =>
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

  const BadgeBackend = () => backendConectado
    ? <div className="feed-badge" style={{ color: "#3ecf6e" }}>{t("camera.backendConnected")}</div>
    : <div className="feed-badge" style={{ color: "#ff4d4f" }}>{t("camera.backendUnavailable")}</div>;

  // Píldora de riesgo flotante — solo en modos con feed visual completo.
  // En bicicleta, la alerta sonora es la única señal (ver reproducirAlerta).
  const RiesgoFlotante = () => (
    <div className="cv-feed-risk-badge">
      <div className="cv-feed-risk-badge-inner" style={{ color: riesgo.color, background: `${riesgo.color}1a` }}>
        <span className="cv-feed-risk-dot" />
        {riesgo.label}
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────
  return (
    <div className="camera-view">
      <div className="cv-header">
        <h1 className="page-title">{cfg.icon} {cfg.title}</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>{t("settings.back")}</button>
      </div>

      <div className="cv-layout">

        {/* ── FEED ── */}
        <div className="cv-feed">

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
                <div className="feed-placeholder">
                  <div className="feed-icon">{cfg.icon}</div>
                  <p className="feed-msg">{cfg.desc}</p>
                  <BadgeBackend />
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
                onEnded={detenerAnalisis}
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
              <AlertaRiesgoAlto />
              {videoUrl && <RiesgoFlotante />}
            </div>
          )}

          {/* ── MODO CÁMARA (bicicleta) ── */}
          {cfg.usaCamera && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>
              {!camaraActiva && (
                <div className="feed-placeholder">
                  <div className="feed-icon">{cfg.icon}</div>
                  <p className="feed-msg">{cfg.desc}</p>
                  <BadgeBackend />
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

              <AlertaRiesgoAlto />
              {feedVisualCompleto && camaraActiva && <RiesgoFlotante />}

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

        {/* ── CONTROLES ── */}
        <div className="cv-controls">
          <div className="ctrl-section">
            <div className="ctrl-title">{t("camera.controls.title")}</div>

            {/* Botones VIDEO */}
            {cfg.usaVideo && (
              <>
                <button
                  className="ctrl-btn primary"
                  onClick={() => fileInputRef.current.click()}
                >
                  {t("camera.controls.loadVideo")}
                </button>
                {videoUrl && !analizando && (
                  <button
                    className="ctrl-btn primary"
                    onClick={reproducirYAnalizar}
                    disabled={!backendConectado}
                  >
                    {t("camera.controls.analyze")}
                  </button>
                )}
                {analizando && (
                  <button className="ctrl-btn" onClick={detenerAnalisis}>
                    {t("camera.controls.pauseAnalysis")}
                  </button>
                )}
                <button
                  className="ctrl-btn danger"
                  onClick={detenerVideo}
                  disabled={!videoUrl}
                >
                  {t("camera.controls.stopVideo")}
                </button>
              </>
            )}

            {/* Botones CÁMARA */}
            {cfg.usaCamera && (
              <>
                {!camaraActiva && (
                  <button className="ctrl-btn primary" onClick={iniciarCamara}>
                    {t("camera.controls.startCamera")}
                  </button>
                )}
                {camaraActiva && !analizando && (
                  <button
                    className="ctrl-btn primary"
                    onClick={iniciarAnalisis}
                    disabled={!backendConectado}
                  >
                    {t("camera.controls.startAnalysis")}
                  </button>
                )}
                {analizando && (
                  <button className="ctrl-btn" onClick={detenerAnalisis}>
                    {t("camera.controls.pauseAnalysis")}
                  </button>
                )}
                <button
                  className="ctrl-btn danger"
                  onClick={detenerCamara}
                  disabled={!camaraActiva}
                >
                  {t("camera.controls.stopCamera")}
                </button>
              </>
            )}
          </div>

          <div className="ctrl-section">
            <div className="ctrl-title">{t("camera.detection.title")}</div>
            <label className="ctrl-toggle">
              <input type="checkbox" defaultChecked />
              <span>{t("camera.detection.vehicles")}</span>
            </label>
            <label className="ctrl-toggle">
              <input type="checkbox" defaultChecked />
              <span>{t("camera.detection.pedestrians")}</span>
            </label>
            <label className="ctrl-toggle">
              <input type="checkbox" />
              <span>{t("camera.detection.staticObstacles")}</span>
            </label>
          </div>

          <div className="ctrl-section">
            <div className="ctrl-title">{t("camera.threshold.title")}</div>
            <div className="range-row">
              <span>{t("camera.threshold.minDist")}</span>
              <input type="range" min={1} max={10} defaultValue={3} />
              <span>3m</span>
            </div>
          </div>

          <div className="risk-indicator">
            <div className="risk-label">{t("camera.riskIndicator.title")}</div>
            <div className="risk-bar">
              <div
                className="risk-fill"
                style={{
                  width: riesgo.width,
                  background: riesgo.color,
                  transition: "width 0.4s ease, background 0.4s ease",
                }}
              />
            </div>
            <div className="risk-text" style={{ color: riesgo.color }}>
              {riesgo.label}
            </div>
            {feedVisualCompleto && resultadoActual?.total_objetos > 0 && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#8b929b" }}>
                {resultadoActual.objetos_detectados.map((obj, i) => (
                  <div key={i}>
                    {obj.clase} — {Math.round(obj.confianza * 100)}% {t("camera.confidence")}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="disclaimer">
        {cfg.usaCamera ? t("camera.disclaimer.visual") : t("camera.disclaimer.pending")}
      </div>
    </div>
  );
}