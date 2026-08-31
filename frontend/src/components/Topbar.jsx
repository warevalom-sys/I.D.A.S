import { ROUTES } from "../Routes";

const ROUTE_LABELS = {
  [ROUTES.DASHBOARD]: "Panel Principal",
  [ROUTES.SIM_VEHICULAR]: "Simulación › Simulación vehicular",
  [ROUTES.SIM_VIDEO]: "Simulación › Cargar video",
  [ROUTES.EXP_PEATON]: "Modo experimental › Peatón",
  [ROUTES.EXP_BICICLETA]: "Modo experimental › Bicicleta",
  [ROUTES.ANALISIS]: "Análisis*",
  [ROUTES.CONFIGURACION]: "Configuración*",
  [ROUTES.ABOUT]: "Acerca del proyecto",
};

export default function Topbar({ currentRoute, navigate, alertCount, onMenuToggle, sesion }) {
  const isHome = currentRoute === ROUTES.DASHBOARD;
  const enModo = currentRoute !== ROUTES.DASHBOARD && currentRoute !== ROUTES.ABOUT;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-toggle-btn" onClick={onMenuToggle} title="F1 — Alternar menú">☰</button>
        {!isHome && (
          <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)} title="Volver al inicio (B / Esc)">
            ← Inicio
          </button>
        )}
        <span className="breadcrumb">{ROUTE_LABELS[currentRoute] || currentRoute}</span>
      </div>

      <div className="topbar-right">

        {/* Stats en tiempo real — solo cuando hay sesión activa */}
        {enModo && sesion?.objetosDetectados > 0 && (
          <div style={{
            display: "flex", gap: "12px", alignItems: "center",
            fontSize: "11px", fontFamily: "var(--font-mono)",
            color: "var(--text-secondary)", marginRight: 8,
          }}>
            <span>◈ {sesion.objetosDetectados} obj</span>
            <span>▶ {sesion.fps} fps</span>
            <span style={{ color: sesion.alertas > 0 ? "var(--red)" : "var(--text-muted)" }}>
              {sesion.estado}
            </span>
          </div>
        )}

        <div className="status-dot live" title="Sistema activo" />
        <span className="status-label">Sistema activo</span>

        {alertCount > 0 && (
          <div className="alert-badge">
            ◬ {alertCount} alertas
          </div>
        )}

        <div className="topbar-time">{new Date().toLocaleDateString("es-CO")}</div>
      </div>
    </header>
  );
}