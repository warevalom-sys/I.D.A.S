import { ROUTES } from "../Routes";
import StatCard from "../components/StatCard";
import AlertPanel from "../components/AlertPanel";

const IconBike = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h3" />
  </svg>
);
const IconWalk = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="13" cy="4" r="1.5" />
    <path d="M15 8l-3 2-3 6M13.5 10l1.5 3 3 1M9 16l-2 5M13 15l3 5" />
  </svg>
);
const IconCar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);

const MODE_META = {
  ciclista: { label: "Modo ciclista", icon: <IconBike /> },
  peaton:   { label: "Modo peatón",   icon: <IconWalk /> },
  carro:    { label: "Modo carro",    icon: <IconCar /> },
};

export default function Dashboard({ navigate, sesion, user }) {
  const quickActions = [
    { label: "Simulación vehicular", icon: "◻", route: ROUTES.SIM_VEHICULAR, accent: "green" },
    { label: "Modo peatón",          icon: "◈", route: ROUTES.EXP_PEATON,    accent: "orange" },
    { label: "Modo bicicleta",       icon: "◎", route: ROUTES.EXP_BICICLETA, accent: "gray" },
  ];

  const modeMeta = MODE_META[sesion.modoKey] || MODE_META.ciclista;
  const userName = user?.name || "Usuario";

  return (
    <div className="dashboard">

      {/* ── MOBILE HOME (solo visible en pantallas chicas, ver media query) ── */}
      <div className="mobile-home">
        <div className="mobile-greeting">
          <h1 className="mobile-greeting-title">Hola, {userName}</h1>
          <p className="mobile-greeting-sub">Listo para salir a rodar</p>
        </div>

        <div className="mode-active-card" onClick={() => navigate(ROUTES.EXP_BICICLETA)}>
          <span className="mode-active-icon">{modeMeta.icon}</span>
          <div className="mode-active-body">
            <div className="mode-active-title">{modeMeta.label}</div>
            <div className="mode-active-sub">Cámara trasera · {sesion.estado || "activo"}</div>
          </div>
          <span className="mode-active-chevron">›</span>
        </div>

        <div className="mobile-stats-row">
          <StatCard value={sesion.alertas} label="Alertas hoy" />
          <StatCard value={sesion.kmRecorridos ?? "—"} unit="km" label="Recorridos" />
        </div>

        <div className="section-title">Actividad reciente</div>
        <div className="activity-list">
          <div className="activity-row">
            <span className="activity-dot high" />
            <span className="activity-text">Vehículo cerca por la izquierda</span>
            <span className="activity-time">08:14</span>
          </div>
          <div className="activity-row">
            <span className="activity-dot medium" />
            <span className="activity-text">Peatón cruzando adelante</span>
            <span className="activity-time">07:52</span>
          </div>
          <div className="activity-row">
            <span className="activity-dot ok" />
            <span className="activity-text">Ruta sin incidentes</span>
            <span className="activity-time">Ayer</span>
          </div>
        </div>
      </div>

      {/* ── DESKTOP DASHBOARD (oculto en mobile, ver media query) ── */}
      <div className="desktop-dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">Panel Principal</h1>
            <p className="page-subtitle">I.D.A.S — Sistema de Soporte Inteligente para la Conducción · v0.1 · Prototipo universitario</p>
          </div>
          <div className="system-status">
            <span className="pulse-dot" />
            <span>Sistema listo</span>
          </div>
        </div>

        <div className="stats-row">
          <StatCard icon="◈" value={sesion.objetosDetectados} label="Objetos detectados (sesión)" accent="blue" />
          <StatCard icon="◬" value={sesion.alertas} label="Alertas activas" accent="orange" />
          <StatCard icon="▶" value={sesion.fps} label="FPS (cámara)" accent="green" />
          <StatCard icon="◎" value={sesion.modo} label={`Modo actual — ${sesion.estado}`} accent="gray" />
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

        <div className="section-title">Alertas</div>
        <AlertPanel navigate={navigate} />

        <div className="disclaimer">
          ⚠ Este sistema es únicamente de asistencia visual. No controla ningún vehículo. La responsabilidad de conducción recae siempre en el conductor.
        </div>
      </div>
    </div>
  );
}