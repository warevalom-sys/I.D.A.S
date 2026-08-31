import { useState } from "react";
import { ROUTES } from "../Routes";

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
      { label: "Bicicleta", route: ROUTES.EXP_BICICLETA, icon: "◎" },
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

/* Prioridad ciclista/peatón: estos tres accesos van directo a la
   barra inferior en móvil. Todo lo demás vive detrás de "Más". */
const BOTTOM_NAV = [
  { label: "Inicio", icon: "⬡", route: ROUTES.DASHBOARD },
  { label: "Peatón", icon: "◈", route: ROUTES.EXP_PEATON },
  { label: "Bicicleta", icon: "◎", route: ROUTES.EXP_BICICLETA },
];

const MORE_ITEMS = [
  { label: "Simulación vehicular", icon: "◻", route: ROUTES.SIM_VEHICULAR },
  { label: "Configuración", icon: "◎", route: ROUTES.CONFIGURACION },
  { label: "Acerca del proyecto", icon: "◯", route: ROUTES.ABOUT },
];

export default function Sidebar({ currentRoute, navigate, isOpen, onToggle }) {
  const [expanded, setExpanded] = useState({ "Simulación": true, "Modo experimental": false });
  const [moreOpen, setMoreOpen] = useState(false);

  const toggleGroup = (label) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isChildActive = (children) =>
    children?.some((c) => c.route === currentRoute);

  const goTo = (route) => {
    setMoreOpen(false);
    navigate(route);
  };

  const isMoreActive = MORE_ITEMS.some((item) => item.route === currentRoute);

  return (
    <>
      {/* ── SIDEBAR: escritorio / modo carro ── */}
      <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-logo" onClick={() => navigate(ROUTES.DASHBOARD)}>
          <span className="logo-icon">⬡</span>
          {isOpen && (
            <div className="logo-text">
<span className="logo-main">I.D.A.S</span>
<span className="logo-sub">Sistema de soporte inteligente para la conducción</span>
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

      {/* ── BARRA INFERIOR: móvil (bici / peatón) ── */}
      <nav className="bottom-nav" aria-label="Navegación principal">
        {BOTTOM_NAV.map((item) => (
          <button
            key={item.route}
            className={`bottom-nav-item ${currentRoute === item.route ? "active" : ""}`}
            onClick={() => goTo(item.route)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${isMoreActive || moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span className="bottom-nav-icon">⋯</span>
          <span className="bottom-nav-label">Más</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="more-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-handle" />
            {MORE_ITEMS.map((item) => (
              <button
                key={item.route}
                className={`more-sheet-item ${currentRoute === item.route ? "active" : ""}`}
                onClick={() => goTo(item.route)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}