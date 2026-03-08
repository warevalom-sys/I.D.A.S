export default function StatCard({ icon, label, value, unit, accent, onClick }) {
  return (
    <div
      className={`stat-card ${accent ? `accent-${accent}` : ""} ${onClick ? "clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
    >
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <span className="stat-value">
          {value}
          {unit && <span className="stat-unit"> {unit}</span>}
        </span>
        <span className="stat-label">{label}</span>
      </div>
    </div>
  );
}