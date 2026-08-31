import { useState } from "react";
import { ROUTES } from "../Routes";

const ALL_ALERTS = [
  { id: 1, level: "high",   icon: "🚗", type: "Vehículo cerca por la izquierda", detail: "Cra 15 con Cl 100", time: "08:14", today: true },
  { id: 2, level: "medium", icon: "🚶", type: "Peatón cruzando adelante",        detail: "Av. Chile",        time: "07:52", today: true },
  { id: 3, level: "high",   icon: "🚴", type: "Ciclista en punto ciego",         detail: "Calle 72",         time: "Ayer",  today: false },
  { id: 4, level: "ok",     icon: "✓",  type: "Ruta sin incidentes",             detail: "Parque Nacional",  time: "Ayer",  today: false },
  { id: 5, level: "medium", icon: "🚗", type: "Vehículo aproximándose por detrás", detail: "Cra 7 con Cl 45", time: "Ayer",  today: false },
  { id: 6, level: "high",   icon: "🚶", type: "Peatón en punto ciego",           detail: "Cl 26",            time: "Hace 2 días", today: false },
  { id: 7, level: "ok",     icon: "✓",  type: "Ruta sin incidentes",             detail: "Ciclovía 7ma",     time: "Hace 2 días", today: false },
];

const LEVEL_META = {
  high:   { label: "Riesgo alto",  className: "risk-high" },
  medium: { label: "Riesgo medio", className: "risk-medium" },
  ok:     { label: null,           className: "risk-ok" },
};

const TABS = [
  { key: "todas", label: "Todas" },
  { key: "altas", label: "Altas" },
  { key: "hoy",   label: "Hoy" },
];

export default function Alertas({ navigate }) {
  const [tab, setTab] = useState("todas");

  const filtered = ALL_ALERTS.filter((a) => {
    if (tab === "altas") return a.level === "high";
    if (tab === "hoy") return a.today;
    return true;
  });

  return (
    <div className="alerts-page">
      <div className="alerts-page-header">
        <h1 className="page-title">Alertas</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
      </div>
      <p className="page-subtitle">{ALL_ALERTS.length} registradas esta semana</p>

      <div className="alerts-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`alerts-tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="alerts-cards">
        {filtered.map((a) => {
          const meta = LEVEL_META[a.level];
          return (
            <div key={a.id} className={`alert-card ${meta.className}`}>
              <div className="alert-card-icon">{a.icon}</div>
              <div className="alert-card-body">
                <div className="alert-card-title">{a.type}</div>
                <div className="alert-card-meta">
                  {meta.label ? `${meta.label} · ${a.detail} · ${a.time}` : `${a.detail} · ${a.time}`}
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="alerts-empty">No hay alertas en este filtro.</p>
        )}
      </div>
    </div>
  );
}