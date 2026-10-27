import { PERFILES, perfilDe, tr } from "../config/perfiles";
import VehicleIcon from "../components/VehicleIcon";
import "../styles/dashboard.css";

const IconShield = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);


function getRiskStatus(sesion, t) {
  const severidad = sesion.riesgoActual; // "alto" | "medio" | "bajo" | null
  if (severidad === "alto") {
    return { label: t("risk.alto.label"), detail: sesion.riesgoDetalle || t("risk.alto.detail"), accent: "red" };
  }
  if (severidad === "medio") {
    return { label: t("risk.medio.label"), detail: sesion.riesgoDetalle || t("risk.medio.detail"), accent: "amber" };
  }
  if (severidad === "bajo") {
    return { label: t("risk.bajo.label"), detail: sesion.riesgoDetalle || t("risk.bajo.detail"), accent: "green" };
  }
  return { label: t("risk.ok.label"), detail: t("risk.ok.detail"), accent: "green" };
}


function modoLabel(sesion, t) {
  return sesion.modo ? t(`camera.mode.${sesion.modo}.title`) : t("session.noSession");
}
function estadoLabel(sesion, t) {
  return t(`session.estado.${sesion.estado || "inactivo"}`);
}




export default function Dashboard({ navigate, sesion, user, t = (key) => key }) {

  const userName = user?.name || "Usuario";
  const risk = getRiskStatus(sesion, t);

  // El perfil (bicicleta / carro / motocicleta) decide el modo principal,
  // el texto del botón y el consejo. El "otro modo" queda como alternativa.
  const perfil = perfilDe(user);
  const otro = PERFILES[perfil.otro];

  return (
    <div className="dashboard hm">

      {/* 1 · Saludo + tipo de usuario + estado del sistema */}
      <header className="hm-header">
        <div>
          <h1 className="hm-greeting">{t("dashboard.greeting")}, {userName}</h1>
          <div className="hm-greeting-row">
            <span className="hm-chip">
              <VehicleIcon tipo={perfil.id} size={16} />
              {tr(t, `profile.${perfil.id}`, perfil.label)}
            </span>
            <span className="hm-greeting-sub">{t("dashboard.readyToRide")}</span>
          </div>
        </div>
        <div className="hm-system" role="status">
          <span className="hm-dot" />
          <span>{t("dashboard.systemReady")}</span>
        </div>
      </header>

      <div className="hm-grid">

        {/* 2 · Acción principal */}
        <button className="hm-hero" onClick={() => navigate(perfil.route)}>
          <span className="hm-hero-icon"><VehicleIcon tipo={perfil.id} size={34} /></span>
          <span className="hm-hero-body">
            <span className="hm-hero-title">{t(perfil.titleKey)}</span>
            <span className="hm-hero-desc">{t(perfil.descKey)}</span>
          </span>
          <span className="hm-hero-cta">{tr(t, `dashboard.startCta.${perfil.id}`, perfil.cta)}</span>
        </button>

        {/* 3 · Estado de riesgo actual */}
        <section className={`hm-risk accent-${risk.accent}`} aria-live="polite">
          <span className="hm-risk-icon"><IconShield /></span>
          <div className="hm-risk-body">
            <div className="hm-risk-label">{risk.label}</div>
            <div className="hm-risk-detail">{risk.detail}</div>
          </div>
          <div className="hm-risk-session">
            {modoLabel(sesion, t)} · {estadoLabel(sesion, t)}
          </div>
        </section>
      </div>

      {/* 4 · Consejo según el tipo de usuario */}
      <p className="hm-tip">{tr(t, `dashboard.tip.${perfil.id}`, perfil.tip)}</p>

      {/* 5 · Otro modo */}
      <h2 className="hm-section">{tr(t, "dashboard.otherMode", "Otro modo")}</h2>
      <button className="hm-mode" onClick={() => navigate(otro.route)}>
        <span className="hm-mode-icon"><VehicleIcon tipo={otro.id} size={26} /></span>
        <span className="hm-mode-body">
          <span className="hm-mode-title">{t(otro.titleKey)}</span>
          <span className="hm-mode-desc">{t(otro.descKey)}</span>
        </span>
        <span className="hm-mode-chevron" aria-hidden="true">›</span>
      </button>

      <p className="hm-note">{t("dashboard.disclaimer")}</p>
    </div>
  );
}