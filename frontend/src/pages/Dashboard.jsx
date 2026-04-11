import { ROUTES } from "../Routes";

export default function Dashboard({ navigate, alertCount }) {
  const quickActions = [
    { label: "Simulación vehicular", icon: "◻", route: ROUTES.SIM_VEHICULAR, accent: "green" },
    { label: "Cargar video", icon: "◫", route: ROUTES.SIM_VIDEO, accent: "blue" },
    { label: "Modo peatón", icon: "◈", route: ROUTES.EXP_PEATON, accent: "orange" },
    { label: "Modo bicicleta", icon: "◎", route: ROUTES.EXP_BICICLETA, accent: "gray" },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Panel Principal</h1>
          <p className="page-subtitle">IDSS — Intelligent Driving Support System · v0.1 · Prototipo universitario</p>
        </div>
        <div className="system-status">
          <span className="pulse-dot" />
          <span>Sistema listo</span>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card accent-blue">
          <div className="stat-icon">◈</div>
          <div className="stat-body">
            <span className="stat-value">0</span>
            <span className="stat-label">Objetos detectados (sesión)</span>
          </div>
        </div>
        <div className="stat-card accent-orange">
          <div className="stat-icon">◬</div>
          <div className="stat-body">
            <span className="stat-value">{alertCount}</span>
            <span className="stat-label">Alertas activas</span>
          </div>
        </div>
        <div className="stat-card accent-green">
          <div className="stat-icon">▶</div>
          <div className="stat-body">
            <span className="stat-value">—</span>
            <span className="stat-label">FPS (cámara)</span>
          </div>
        </div>
        <div className="stat-card accent-gray">
          <div className="stat-icon">◎</div>
          <div className="stat-body">
            <span className="stat-value">Inactivo</span>
            <span className="stat-label">Modo actual</span>
          </div>
        </div>
      </div>

      <div className="section-title">Acciones rápidas</div>
      <div className="quick-actions">
        {quickActions.map((a) => (
          <button
            key={a.route}
            className={`quick-btn accent-${a.accent}`}
            onClick={() => navigate(a.route)}
          >
            <span className="qa-icon">{a.icon}</span>
            <span className="qa-label">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="section-title">Modos disponibles este semestre</div>
      <div className="modes-grid">
        <div className="mode-card" onClick={() => navigate(ROUTES.SIM_VEHICULAR)}>
          <div className="mode-icon">◻</div>
          <div className="mode-info">
            <div className="mode-name">Simulación vehicular</div>
            <div className="mode-desc">Análisis de videos de conducción para detectar vehículos, peatones y obstáculos en tráfico simulado.</div>
          </div>
        </div>
        <div className="mode-card" onClick={() => navigate(ROUTES.EXP_PEATON)}>
          <div className="mode-icon">◈</div>
          <div className="mode-info">
            <div className="mode-name">Modo experimental — Peatón</div>
            <div className="mode-desc">Detección en tiempo real usando cámara de celular o webcam mientras una persona camina.</div>
          </div>
        </div>
        <div className="mode-card" onClick={() => navigate(ROUTES.EXP_BICICLETA)}>
          <div className="mode-icon">◎</div>
          <div className="mode-info">
            <div className="mode-name">Modo experimental — Bicicleta</div>
            <div className="mode-desc">Detección en tiempo real para desplazamiento en bicicleta a baja velocidad.</div>
          </div>
        </div>
      </div>

      <div className="disclaimer">
        ⚠ Este sistema es únicamente de asistencia visual. No controla ningún vehículo. La responsabilidad de conducción recae siempre en el conductor.
      </div>
    </div>
  );
}