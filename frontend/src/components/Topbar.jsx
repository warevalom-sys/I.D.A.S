import { ROUTES } from "../Routes";

function buildRouteLabels(t) {
  return {
    [ROUTES.DASHBOARD]: t("topbar.route.dashboard"),
    [ROUTES.SIM_VEHICULAR]: t("topbar.route.simVehicular"),
    [ROUTES.SIM_VIDEO]: t("topbar.route.simVideo"),
    [ROUTES.EXP_BICICLETA]: t("topbar.route.bicicleta"),
    [ROUTES.ANALISIS]: t("topbar.route.analisis"),
    [ROUTES.CONFIGURACION]: t("topbar.route.configuracion"),
    [ROUTES.ABOUT]: t("topbar.route.about"),
  };
}

export default function Topbar({
  currentRoute,
  navigate,
  alertCount,
  onMenuToggle,
  sesion,
  onLogout,
  t = (key) => key,
  idioma = "es",
}) {
  const isHome = currentRoute === ROUTES.DASHBOARD;
  const enModo = currentRoute !== ROUTES.DASHBOARD && currentRoute !== ROUTES.ABOUT;
  const ROUTE_LABELS = buildRouteLabels(t);
  const localeFecha = idioma === "en" ? "en-US" : "es-CO";
  const estadoLabel = t(`session.estado.${sesion?.estado || "inactivo"}`);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn menu-toggle-btn" onClick={onMenuToggle} title={t("topbar.menuToggleTitle")}>☰</button>
        {!isHome && (
          <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)} title={t("topbar.backTitle")}>
            {t("topbar.back")}
          </button>
        )}
        <span className="breadcrumb">{ROUTE_LABELS[currentRoute] || currentRoute}</span>
      </div>

      <div className="topbar-right">

        {/* Estado de la sesión activa — sin métricas de desarrollo (FPS,
            conteo de objetos); esas viven en el módulo de Análisis, no aquí. */}
        {enModo && sesion?.estado && sesion.estado !== "inactivo" && (
          <span
            className="topbar-session-state"
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              marginRight: 8,
            }}
          >
            {estadoLabel}
          </span>
        )}

        <div className="status-dot live" title={t("topbar.systemActive")} />
        <span className="status-label">{t("topbar.systemActive")}</span>

        {alertCount > 0 && (
          <div className="alert-badge">
            ◬ {alertCount} {t("topbar.alerts")}
          </div>
        )}

        <div className="topbar-time">{new Date().toLocaleDateString(localeFecha)}</div>

        {onLogout && (
          <button className="icon-btn logout-btn" onClick={onLogout} title={t("topbar.logoutTitle")}>
            ⏻
          </button>
        )}
      </div>
    </header>
  );
}