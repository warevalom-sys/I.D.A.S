import { useState } from "react";
import { ROUTES } from "../routes";

const MENU = [
  {
    label: "Inicio",
    icon: "⬡",
    route: ROUTES.DASHBOARD,
  },
  {
    label: "Simulación",
    icon: "◈",
    children: [
      { label: "Simulación vehicular", route: ROUTES.SIM_VEHICULAR, icon: "◻" },
    ],
  },
  {
    label: "Modo experimental",
    icon: "▶",
    children: [
      { label: "Peatón", route: ROUTES.EXP_PEATON, icon: "◈" },
    ],
  },
  {
    label: "Análisis*",
    icon: "◱",
    route: ROUTES.ANALISIS,
  },
  {
    label: "Configuración*",
    icon: "◎",
    route: ROUTES.CONFIGURACION,
  },
  {
    label: "Acerca del proyecto",
    icon: "◯",
    route: ROUTES.ABOUT,
  },
];

export default function Sidebar({ currentRoute, navigate, isOpen, onToggle }) {
  const [expanded, setExpanded] = useState({ "Simulación": true, "Modo experimental": false });

  const toggleGroup = (label) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isChildActive = (children) =>
    children?.some((c) => c.route === currentRoute);

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="sidebar-logo" onClick={() => navigate(ROUTES.DASHBOARD)}>
        <span className="logo-icon">⬡</span>
        {isOpen && (
          <div className="logo-text">
            <span className="logo-main">IDSS</span>
            <span className="logo-sub">Intelligent Driving Support System</span>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {MENU.map((item) => {
          if (!item.children) {
            const isFuture = item.label.endsWith("*");
            return (
              <button
                key={item.route}
                className={`nav-item top-level ${currentRoute === item.route ? "active" : ""} ${isFuture ? "future" : ""}`}
                onClick={() => navigate(item.route)}
                title={!isOpen ? item.label : ""}
              >
                <span className="nav-icon">{item.icon}</span>
                {isOpen && <span className="nav-label">{item.label}</span>}
              </button>
            );
          }

          const isExp = expanded[item.label];
          const hasActive = isChildActive(item.children);

          return (
            <div key={item.label} className={`nav-group ${hasActive ? "has-active" : ""}`}>
              <button
                className={`nav-item group-header ${isExp ? "expanded" : ""} ${hasActive ? "parent-active" : ""}`}
                onClick={() => toggleGroup(item.label)}
                title={!isOpen ? item.label : ""}
              >
                <span className="nav-icon">{item.icon}</span>
                {isOpen && (
                  <>
                    <span className="nav-label">{item.label}</span>
                    <span className={`chevron ${isExp ? "up" : "down"}`}>›</span>
                  </>
                )}
              </button>

              {isOpen && isExp && (
                <div className="nav-children">
                  {item.children.map((child) => (
                    <button
                      key={child.route}
                      className={`nav-item child ${currentRoute === child.route ? "active" : ""}`}
                      onClick={() => navigate(child.route)}
                    >
                      <span className="nav-icon small">{child.icon}</span>
                      <span className="nav-label">{child.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {isOpen && (
          <div className="keyboard-hints">
            <span>↑↓ Navegar</span>
            <span>Home / B / Esc → Inicio</span>
            <span>F1 → Menú</span>
          </div>
        )}
        <button className="toggle-btn" onClick={onToggle} title="F1 — Colapsar menú">
          {isOpen ? "◂" : "▸"}
        </button>
      </div>
    </aside>
  );
}