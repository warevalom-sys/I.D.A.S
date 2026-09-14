import { ROUTES } from "../Routes";

const IconBike = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="18.5" cy="17.5" r="3.5" />
    <path d="M15 6a1 1 0 100-2 1 1 0 000 2zM12 17.5V14l-3-3 4-3 2 3h3" />
  </svg>
);
const IconCar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 13l1.5-4.5A2 2 0 016.4 7h11.2a2 2 0 011.9 1.5L21 13v5a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H6v1a1 1 0 01-1 1H4a1 1 0 01-1-1v-5z" />
    <circle cx="7" cy="17" r="1.5" />
    <circle cx="17" cy="17" r="1.5" />
  </svg>
);
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

function modeMeta(t) {
  return {
    ciclista: { labelKey: "dashboard.modeMeta.ciclista", icon: <IconBike /> },
    carro: { labelKey: "dashboard.modeMeta.carro", icon: <IconCar /> },
  };
}

// Deriva el estado de riesgo a partir de la severidad más alta activa.
// Ajusta esta función a como tu backend exponga el riesgo actual.
function getRiskStatus(sesion, t) {
  const severidad = sesion.riesgoActual; // "alto" | "medio" | "bajo" | null
  if (severidad === "alto") {
    return { level: "alto", label: t("risk.alto.label"), detail: sesion.riesgoDetalle || t("risk.alto.detail"), accent: "red" };
  }
  if (severidad === "medio") {
    return { level: "medio", label: t("risk.medio.label"), detail: sesion.riesgoDetalle || t("risk.medio.detail"), accent: "amber" };
  }
  if (severidad === "bajo") {
    return { level: "bajo", label: t("risk.bajo.label"), detail: sesion.riesgoDetalle || t("risk.bajo.detail"), accent: "green" };
  }
  return { level: "ok", label: t("risk.ok.label"), detail: t("risk.ok.detail"), accent: "green" };
}

// Traduce sesion.modo ("vehicular" | "video" | "bicicleta" | null) y
// sesion.estado ("inactivo" | "pausado" | "analizando" | "riesgoAlto").
function modoLabel(sesion, t) {
  return sesion.modo ? t(`camera.mode.${sesion.modo}.title`) : t("session.noSession");
}
function estadoLabel(sesion, t) {
  return t(`session.estado.${sesion.estado || "activo"}`);
}

function RiskStatusCard({ sesion, t }) {
  const risk = getRiskStatus(sesion, t);
  return (
    <div className={`risk-status-card accent-${risk.accent}`}>
      <span className="risk-status-icon">
        <IconShield />
      </span>
      <div className="risk-status-body">
        <div className="risk-status-label">{risk.label}</div>
        <div className="risk-status-detail">{risk.detail}</div>
      </div>
      <div className="risk-status-mode">
        <span className="risk-status-mode-dot" />
        {modoLabel(sesion, t)} · {estadoLabel(sesion, t)}
      </div>
    </div>
  );
}

export default function Dashboard({ navigate, sesion, user, t = (key) => key }) {
  const quickActions = [
    { titleKey: "camera.mode.vehicular.title", icon: "◻", route: ROUTES.SIM_VEHICULAR, accent: "green" },
    { titleKey: "camera.mode.bicicleta.title", icon: "◎", route: ROUTES.EXP_BICICLETA, accent: "gray" },
  ];

  const META = modeMeta(t);
  const meta = META[sesion.modoKey] || META.ciclista;
  const userName = user?.name || "Usuario";
  const risk = getRiskStatus(sesion, t);

  return (
    <div className="dashboard">

      {/* ── MOBILE HOME (solo visible en pantallas chicas, ver media query) ── */}
      <div className="mobile-home">
        <div className="mobile-greeting">
          <h1 className="mobile-greeting-title">{t("dashboard.greeting")}, {userName}</h1>
          <p className="mobile-greeting-sub">{t("dashboard.readyToRide")}</p>
        </div>

        <div className="mode-active-card" onClick={() => navigate(ROUTES.EXP_BICICLETA)}>
          <span className="mode-active-icon">{meta.icon}</span>
          <div className="mode-active-body">
            <div className="mode-active-title">{t(meta.labelKey)}</div>
            <div className="mode-active-sub">{t("dashboard.mobileRear")} · {estadoLabel(sesion, t)}</div>
          </div>
          <span className="mode-active-chevron">›</span>
        </div>

        {/* Antes: mobile-stats-row con "Alertas hoy" (conteo) + km.
            Ahora: mismo indicador de riesgo actual que en desktop. */}
        <div className={`mobile-risk-card accent-${risk.accent}`}>
          <span className="mobile-risk-icon">
            <IconShield />
          </span>
          <div>
            <div className="mobile-risk-label">{risk.label}</div>
            <div className="mobile-risk-detail">{risk.detail}</div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP DASHBOARD (oculto en mobile, ver media query) ── */}
      <div className="desktop-dashboard">
        <div className="dashboard-header">
          <div>
            <h1 className="page-title">{t("topbar.route.dashboard")}</h1>
            <p className="page-subtitle">{t("dashboard.subtitle")}</p>
          </div>
          <div className="system-status">
            <span className="pulse-dot" />
            <span>{t("dashboard.systemReady")}</span>
          </div>
        </div>

        {/* Antes: stats-row con Objetos detectados, Alertas activas, FPS, Modo.
            Ahora: un único indicador de riesgo AHORA, sin métricas de desarrollo. */}
        <RiskStatusCard sesion={sesion} t={t} />

        <div className="section-title">{t("dashboard.quickActions")}</div>
        <div className="quick-actions">
          {quickActions.map((a) => (
            <button
              key={a.route}
              className={`quick-btn accent-${a.accent}`}
              onClick={() => navigate(a.route)}
            >
              <span className="qa-icon">{a.icon}</span>
              <span className="qa-label">{t(a.titleKey)}</span>
            </button>
          ))}
        </div>

        <div className="section-title">{t("dashboard.modesAvailable")}</div>
        <div className="modes-grid">
          <div className="mode-card" onClick={() => navigate(ROUTES.SIM_VEHICULAR)}>
            <div className="mode-icon">◻</div>
            <div className="mode-info">
              <div className="mode-name">{t("camera.mode.vehicular.title")}</div>
              <div className="mode-desc">{t("dashboard.mode.vehicular.desc")}</div>
            </div>
          </div>
          <div className="mode-card" onClick={() => navigate(ROUTES.EXP_BICICLETA)}>
            <div className="mode-icon">◎</div>
            <div className="mode-info">
              <div className="mode-name">{t("dashboard.mode.bicicletaExp.title")}</div>
              <div className="mode-desc">{t("dashboard.mode.bicicleta.desc")}</div>
            </div>
          </div>
        </div>

        <div className="disclaimer">
          {t("dashboard.disclaimer")}
        </div>
      </div>
    </div>
  );
}