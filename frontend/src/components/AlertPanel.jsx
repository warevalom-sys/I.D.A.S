import { ROUTES } from "../Routes";

const MOCK_ALERTS = [
  { id: 1, level: "high", msg: "Objeto detectado a menos de 2m", time: "14:32:01", type: "Vehículo" },
  { id: 2, level: "medium", msg: "Peatón en zona de riesgo", time: "14:31:47", type: "Peatón" },
  { id: 3, level: "low", msg: "Obstáculo estático detectado", time: "14:30:12", type: "Obstáculo" },
];

const LEVEL_LABELS = { high: "ALTO", medium: "MEDIO", low: "BAJO" };

export default function AlertPanel({ navigate }) {
  return (
    <div className="alert-panel">
      <div className="panel-header">
        <span className="panel-title">◬ Alertas recientes</span>
        <button className="panel-link" onClick={() => navigate && navigate(ROUTES.ALERTS)}>
          Ver todas →
        </button>
      </div>
      <div className="alerts-list">
        {MOCK_ALERTS.map((a) => (
          <div key={a.id} className={`alert-row risk-${a.level}`}>
            <div className="alert-meta">
              <span className={`risk-badge ${a.level}`}>{LEVEL_LABELS[a.level]}</span>
              <span className="alert-type">{a.type}</span>
            </div>
            <span className="alert-msg">{a.msg}</span>
            <span className="alert-time">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}