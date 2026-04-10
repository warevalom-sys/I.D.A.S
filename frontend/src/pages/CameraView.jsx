import { useRef, useState, useEffect, useCallback } from "react";
import { ROUTES } from "../Routes";
import { analizarFrame, capturarFrameDeVideo, verificarConexion } from "../services/api";

const INTERVALO_MS = 750;

const RIESGO_CONFIG = {
  ninguno: { color: "#4ade80", width: "0%",   label: "SIN RIESGO" },
  bajo:    { color: "#facc15", width: "30%",  label: "RIESGO BAJO" },
  medio:   { color: "#f97316", width: "65%",  label: "RIESGO MEDIO" },
  alto:    { color: "#ef4444", width: "100%", label: "RIESGO ALTO" },
};

const MODE_CONFIG = {
  vehicular: {
    title: "Simulación vehicular",
    icon: "◻",
    desc: "Cargue un video de conducción para analizar situaciones de tráfico: vehículos cercanos, peatones y posibles colisiones.",
    primaryBtn: "◫ Cargar video de simulación",
    showUpload: true,
    usaCamera: false,
  },
  video: {
    title: "Cargar video",
    icon: "◫",
    desc: "Seleccione cualquier archivo de video para procesarlo con el módulo de visión computacional.",
    primaryBtn: "◫ Seleccionar archivo",
    showUpload: true,
    usaCamera: false,
  },
  peaton: {
    title: "Modo experimental — Peatón",
    icon: "◈",
    desc: "Activa la cámara en tiempo real para detectar obstáculos mientras caminas.",
    primaryBtn: "▶ Iniciar cámara",
    showUpload: false,
    usaCamera: true,
  },
  bicicleta: {
    title: "Modo experimental — Bicicleta",
    icon: "◎",
    desc: "Detección en tiempo real optimizada para desplazamiento en bicicleta a baja velocidad.",
    primaryBtn: "▶ Iniciar cámara",
    showUpload: false,
    usaCamera: true,
  },
};

export default function CameraView({ mode, navigate }) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.vehicular;

  // Refs para video y canvas (solo modos con cámara)
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervaloRef = useRef(null);

  // Estado
  const [camaraActiva, setCamaraActiva] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [backendConectado, setBackendConectado] = useState(false);
  const [resultadoActual, setResultadoActual] = useState(null);
  const [fps, setFps] = useState("—");
  const [error, setError] = useState(null);

  // Verificar backend al montar (solo si el modo usa cámara)
  useEffect(() => {
    if (!cfg.usaCamera) return;
    verificarConexion().then(setBackendConectado);
  }, [cfg.usaCamera]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      clearInterval(intervaloRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Cámara ──────────────────────────────────────────
  const iniciarCamara = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
  video: { width: 640, height: 480 },
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
    clearInterval(intervaloRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCamaraActiva(false);
    setAnalizando(false);
    setResultadoActual(null);
    setFps("—");
    // Limpiar canvas
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // ── Análisis ─────────────────────────────────────────
  const dibujarDetecciones = useCallback((objetos) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objetos.forEach((obj) => {
      const { x, y, ancho, alto } = obj.bbox;
      const color = obj.clase === "persona" ? "#60a5fa" : "#f97316";

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, ancho, alto);

      ctx.fillStyle = color;
      ctx.fillRect(x, y - 20, ancho, 20);
      ctx.fillStyle = "#000";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`${obj.clase} ${Math.round(obj.confianza * 100)}%`, x + 4, y - 5);
    });
  }, []);

  const iniciarAnalisis = useCallback(() => {
    if (!camaraActiva || !backendConectado) return;
    setAnalizando(true);
    let ultimoTiempo = Date.now();

    intervaloRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;
      try {
        const blob = await capturarFrameDeVideo(videoRef.current);
        const resultado = await analizarFrame(blob);
        setResultadoActual(resultado);

        const ahora = Date.now();
        setFps(Math.round(1000 / (ahora - ultimoTiempo)));
        ultimoTiempo = ahora;

        dibujarDetecciones(resultado.objetos_detectados);
      } catch (err) {
        console.error("Error enviando frame:", err);
      }
    }, INTERVALO_MS);
  }, [camaraActiva, backendConectado, dibujarDetecciones]);

  const detenerAnalisis = () => {
    clearInterval(intervaloRef.current);
    setAnalizando(false);
    const ctx = canvasRef.current?.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // ── Datos para la UI ──────────────────────────────────
  const riesgoKey = resultadoActual?.nivel_riesgo || "ninguno";
  const riesgo = RIESGO_CONFIG[riesgoKey];

  // ── Handler del botón primario según modo ────────────
  const handlePrimaryBtn = () => {
    if (!cfg.usaCamera) return; // upload: implementar después
    if (!camaraActiva) iniciarCamara();
    else if (!analizando) iniciarAnalisis();
  };

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

          {/* Modos SIN cámara — placeholder original */}
          {!cfg.usaCamera && (
            <div className="feed-placeholder">
              <div className="feed-icon">{cfg.icon}</div>
              <p className="feed-msg">{cfg.desc}</p>
              <div className="feed-badge">Módulo de visión computacional — En construcción</div>
            </div>
          )}

          {/* Modos CON cámara */}
          {cfg.usaCamera && (
            <div style={{ position: "relative", width: "100%", height: "100%" }}>

              {/* Placeholder antes de activar cámara */}
              {!camaraActiva && (
                <div className="feed-placeholder">
                  <div className="feed-icon">{cfg.icon}</div>
                  <p className="feed-msg">{cfg.desc}</p>
                  {!backendConectado && (
                    <div className="feed-badge" style={{ color: "#ef4444" }}>
                      ⚠ Backend no disponible — inicia el servidor Python
                    </div>
                  )}
                  {backendConectado && (
                    <div className="feed-badge" style={{ color: "#4ade80" }}>
                      ● Backend conectado
                    </div>
                  )}
                </div>
              )}

              {/* Video en vivo */}
              <video
                ref={videoRef}
                muted
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: camaraActiva ? "block" : "none",
                }}
              />

              {/* Canvas de bounding boxes — superpuesto al video */}
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  top: 0, left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                  display: camaraActiva ? "block" : "none",
                }}
              />

              {/* Error de cámara */}
              {error && (
                <div style={{
                  position: "absolute", bottom: 8, left: 8, right: 8,
                  background: "#7f1d1d", color: "#fca5a5",
                  padding: "0.5rem", borderRadius: 6, fontSize: "0.8rem"
                }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {/* Barra inferior con FPS — siempre visible */}
          <div className="feed-overlay-info">
            <span>IDSS — {cfg.title.toUpperCase()}</span>
            <span>FPS: {fps}</span>
          </div>
        </div>

        {/* ── CONTROLES ── */}
        <div className="cv-controls">

          <div className="ctrl-section">
            <div className="ctrl-title">Controles</div>

            {/* Botón primario */}
            {cfg.usaCamera ? (
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
                    title={!backendConectado ? "Backend no disponible" : ""}
                  >
                    🔍 Iniciar análisis
                  </button>
                )}
                {analizando && (
                  <button className="ctrl-btn" onClick={detenerAnalisis}>
                    ⏸ Pausar análisis
                  </button>
                )}
              </>
            ) : (
              <button className="ctrl-btn primary">{cfg.primaryBtn}</button>
            )}

            {cfg.showUpload && (
              <button className="ctrl-btn" disabled>▶ Analizar</button>
            )}

            <button
              className="ctrl-btn danger"
              onClick={cfg.usaCamera ? detenerCamara : undefined}
              disabled={cfg.usaCamera ? !camaraActiva : true}
            >
              ■ Detener
            </button>
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

          {/* Indicador de riesgo — ahora conectado al estado real */}
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

            {/* Objetos detectados */}
            {resultadoActual?.total_objetos > 0 && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
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