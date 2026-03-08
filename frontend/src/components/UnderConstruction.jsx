import { ROUTES } from "../routes";

export default function UnderConstruction({ route, navigate }) {
  const isFuture = route?.endsWith("*");

  return (
    <div className="under-construction">
      <div className="uc-card">
        <div className="uc-icon">{isFuture ? "◎" : "◈"}</div>
        <h2 className="uc-title">En construcción</h2>
        <p className="uc-desc">
          {isFuture
            ? "Esta funcionalidad está marcada para implementación futura y no está disponible en este semestre."
            : "Esta sección está siendo desarrollada. Estará disponible próximamente."}
        </p>
        <div className="uc-route-badge">{route}</div>
        <button className="uc-home-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
          ← Volver al inicio
        </button>
        {isFuture && (
          <p className="uc-note">
            * Las opciones marcadas con asterisco corresponden a funcionalidades planificadas para versiones futuras del sistema.
          </p>
        )}
      </div>
    </div>
  );
}