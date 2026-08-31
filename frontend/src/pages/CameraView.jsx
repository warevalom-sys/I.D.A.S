import { useRef, useState, useEffect, useCallback } from "react";
import { ROUTES } from "../Routes";
import { analizarFrame, capturarFrameDeVideo, verificarConexion, crearSesion } from "../services/api";

const INTERVALO_MS = 750;

const RIESGO_CONFIG = {
  ninguno: { color: "#3ecf6e", width: "0%",   label: "Sin riesgo" },
  bajo:    { color: "#ffc93c", width: "30%",  label: "Riesgo bajo" },
  medio:   { color: "#ff9f43", width: "65%",  label: "Riesgo medio" },
  alto:    { color: "#ff4d4f", width: "100%", label: "Riesgo alto" },
};

const MODE_CONFIG = {
  vehicular: {
    title: "Simulación vehicular",
    icon: "◻",
    desc: "Cargue un video de conducción para analizar situaciones de tráfico: vehículos cercanos, peatones y posibles colisiones.",
    usaCamera: false,
    usaVideo: true,
  },
  video: {
    title: "Cargar video",
    icon: "◫",
    desc: "Seleccione cualquier archivo de video para procesarlo con el módulo de visión computacional.",
    usaCamera: false,
    usaVideo: true,
  },
  peaton: {
    title: "Modo experimental — Peatón",
    icon: "◈",
    desc: "Activa la cámara en tiempo real para detectar obstáculos mientras caminas.",
    usaCamera: true,
    usaVideo: false,
  },
  bicicleta: {
    title: "Modo experimental — Bicicleta",
    icon: "◎",
    desc: "Detección en tiempo real optimizada para desplazamiento en bicicleta a baja velocidad.",
    usaCamera: true,
    usaVideo: false,
  },
};

export default function CameraView({ mode, navigate, onSesionUpdate }) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.vehicular;

  const videoRef     = useRef(null);
  const canvasRef    = useRef(null);
  const intervaloRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioCtxRef  = useRef(null);
  const sonandoRef   = useRef(false);
  const sesionIdRef  = useRef(null);  // ← fix principal

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
        const id = await crearSesion();
        setSesionId(id);
        sesionIdRef.current = id;  // ← fix principal
        console.log("Sesion creada:", id);
      } catch (err) {
        console.error("Error creando sesión:", err);
      }
    };
    initSesion();
  }, []);

  useEffect(() => {
    return () => {
      clearInterval(intervaloRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      detenerAlerta();
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
      modo: cfg.title,
      objetosDetectados: resultadoActual.total_objetos,
      alertas: esAlto ? 1 : 0,
      fps: fps,
      estado: analizando ? (esAlto ? "⚠ Riesgo alto" : "Analizando") : "Pausado",
    });
  }, [resultadoActual, analizando, fps]);

  // ── Análisis ──────────────────────────────────────────
  const dibujarDetecciones = useCallback((objetos) => {
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
  }, []);

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
      if (!sesionIdRef.current) return;  // ← fix principal
      try {
        const blob      = await capturarFrameDeVideo(videoRef.current);
        const resultado = await analizarFrame(blob, sesionIdRef.current);  // ← fix
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
      }
    } catch (err) {
      setError("No se pudo acceder a la cámara: " + err.message);
    }
  };

  const detenerCamara = () => {
    detenerAnalisis();
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
    setResultadoActual(null);
    setFps("—");
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
  };

  // ── UI ────────────────────────────────────────────────
  const riesgoKey = resultadoActual?.nivel_riesgo || "ninguno";
  const riesgo    = RIESGO_CONFIG[riesgoKey];

  const AlertaRiesgoAlto = () =>
    analizando && resultadoActual?.nivel_riesgo === "alto" ? (
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
          ⚠ Riesgo alto — posible colisión
        </div>
      </div>
    ) : null;

  const BadgeBackend = () => backendConectado
    ? <div className="feed-badge" style={{ color: "#3ecf6e" }}>● Backend conectado</div>
    : <div className="feed-badge" style={{ color: "#ff4d4f" }}>⚠ Backend no disponible</div>;

  // Píldora de riesgo flotante — solo se muestra en móvil (ver App.css)
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
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
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

          {/* ── MODO CÁMARA ── */}
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

              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute", top: 0, left: 0,
                  width: "100%", height: "100%",
                  pointerEvents: "none",
                  display: camaraActiva ? "block" : "none",
                }}
              />

              <AlertaRiesgoAlto />
              {camaraActiva && <RiesgoFlotante />}

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

          <div className="feed-overlay-info">
            <span>COLVIS — {cfg.title}</span>
            <span>FPS: {fps}</span>
          </div>
        </div>

        {/* ── CONTROLES ── */}
        <div className="cv-controls">
          <div className="ctrl-section">
            <div className="ctrl-title">Controles</div>

            {/* Botones VIDEO */}
            {cfg.usaVideo && (
              <>
                <button
                  className="ctrl-btn primary"
                  onClick={() => fileInputRef.current.click()}
                >
                  ◫ Cargar video
                </button>
                {videoUrl && !analizando && (
                  <button
                    className="ctrl-btn primary"
                    onClick={reproducirYAnalizar}
                    disabled={!backendConectado}
                  >
                    ▶ Analizar
                  </button>
                )}
                {analizando && (
                  <button className="ctrl-btn" onClick={detenerAnalisis}>
                    ⏸ Pausar análisis
                  </button>
                )}
                <button
                  className="ctrl-btn danger"
                  onClick={detenerVideo}
                  disabled={!videoUrl}
                >
                  ■ Detener video
                </button>
              </>
            )}

            {/* Botones CÁMARA */}
            {cfg.usaCamera && (
              <>
                {!camaraActiva && (
                  <button className="ctrl-btn primary" onClick={iniciarCamara}>
                    ▶ Iniciar cámara
                  </button>
                )}
                {camaraActiva && !analizando && (
                  <button
                    className="ctrl-btn primary"
                    onClick={iniciarAnalisis}
                    disabled={!backendConectado}
                  >
                    🔍 Iniciar análisis
                  </button>
                )}
                {analizando && (
                  <button className="ctrl-btn" onClick={detenerAnalisis}>
                    ⏸ Pausar análisis
                  </button>
                )}
                <button
                  className="ctrl-btn danger"
                  onClick={detenerCamara}
                  disabled={!camaraActiva}
                >
                  ■ Detener cámara
                </button>
              </>
            )}
          </div>

          <div className="ctrl-section">
            <div className="ctrl-title">Detección</div>
            <label className="ctrl-toggle">
              <input type="checkbox" defaultChecked />
              <span>Vehículos</span>
            </label>
            <label className="ctrl-toggle">
              <input type="checkbox" defaultChecked />
              <span>Peatones</span>
            </label>
            <label className="ctrl-toggle">
              <input type="checkbox" />
              <span>Obstáculos estáticos</span>
            </label>
          </div>

          <div className="ctrl-section">
            <div className="ctrl-title">Umbral de alerta</div>
            <div className="range-row">
              <span>Dist. mín:</span>
              <input type="range" min={1} max={10} defaultValue={3} />
              <span>3m</span>
            </div>
          </div>

          <div className="risk-indicator">
            <div className="risk-label">Nivel de riesgo</div>
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
            {resultadoActual?.total_objetos > 0 && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#8b929b" }}>
                {resultadoActual.objetos_detectados.map((obj, i) => (
                  <div key={i}>
                    {obj.clase} — {Math.round(obj.confianza * 100)}% confianza
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="disclaimer">
        {cfg.usaCamera
          ? "⚠ Este sistema es únicamente de asistencia visual. No controla ningún vehículo."
          : "⚠ El módulo de procesamiento Python se conectará a esta interfaz en la siguiente fase."}
      </div>
    </div>
  );
}