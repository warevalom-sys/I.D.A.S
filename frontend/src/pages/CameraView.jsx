import { ROUTES } from "../routes";

const MODE_CONFIG = {
  vehicular: {
    title: "Simulación vehicular",
    icon: "◻",
    desc: "Cargue un video de conducción para analizar situaciones de tráfico: vehículos cercanos, peatones y posibles colisiones.",
    primaryBtn: "◫ Cargar video de simulación",
    showUpload: true,
  },
  video: {
    title: "Cargar video",
    icon: "◫",
    desc: "Seleccione cualquier archivo de video para procesarlo con el módulo de visión computacional.",
    primaryBtn: "◫ Seleccionar archivo",
    showUpload: true,
  },
  peaton: {
    title: "Modo experimental — Peatón",
    icon: "◈",
    desc: "Activa la cámara en tiempo real para detectar obstáculos mientras caminas. Usa la cámara de tu celular o webcam.",
    primaryBtn: "▶ Iniciar cámara",
    showUpload: false,
  },
  bicicleta: {
    title: "Modo experimental — Bicicleta",
    icon: "◎",
    desc: "Detección en tiempo real optimizada para desplazamiento en bicicleta a baja velocidad.",
    primaryBtn: "▶ Iniciar cámara",
    showUpload: false,
  },
};

export default function CameraView({ mode, navigate }) {
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.vehicular;

  return (
    <div className="camera-view">
      <div className="cv-header">
        <h1 className="page-title">{cfg.icon} {cfg.title}</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
      </div>

      <div className="cv-layout">
        <div className="cv-feed">
          <div className="feed-placeholder">
            <div className="feed-icon">{cfg.icon}</div>
            <p className="feed-msg">{cfg.desc}</p>
            <div className="feed-badge">Módulo de visión computacional — En construcción</div>
          </div>
          <div className="feed-overlay-info">
            <span>IDSS — {cfg.title.toUpperCase()}</span>
            <span>FPS: —</span>
          </div>
        </div>

        <div className="cv-controls">
          <div className="ctrl-section">
            <div className="ctrl-title">Controles</div>
            <button className="ctrl-btn primary">{cfg.primaryBtn}</button>
            {cfg.showUpload && <button className="ctrl-btn" disabled>▶ Analizar</button>}
            <button className="ctrl-btn danger" disabled>■ Detener</button>
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
              <div className="risk-fill" style={{ width: "0%" }} />
            </div>
            <div className="risk-text">SIN DATOS</div>
          </div>
        </div>
      </div>

      <div className="disclaimer">
        ⚠ El módulo de procesamiento Python (visión computacional) se conectará a esta interfaz en la siguiente fase del desarrollo.
      </div>
    </div>
  );
}