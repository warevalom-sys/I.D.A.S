import { ROUTES } from "../routes";

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

export default function Topbar({ currentRoute, navigate, alertCount, onMenuToggle }) {
  const isHome = currentRoute === ROUTES.DASHBOARD;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenuToggle} title="F1 — Alternar menú">
          ☰
        </button>
        {!isHome && (
          <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)} title="Volver al inicio (B / Esc)">
            ← Inicio
          </button>
        )}
        <span className="breadcrumb">{ROUTE_LABELS[currentRoute] || currentRoute}</span>
      </div>

      <div className="topbar-right">
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