import { useState } from "react";
import { ROUTES } from "../Routes";

/* Antes: "Simulación" y "Modo experimental" eran grupos desplegables,
   pero cada uno solo tenía un hijo real (Peatón salió de alcance).
   Un grupo con un solo hijo es un clic extra sin ningún beneficio,
   así que ahora todo vive plano en el nivel superior. */
function buildMenu(t) {
  return [
    { labelKey: "sidebar.menu.home", icon: "⬡", route: ROUTES.DASHBOARD },
    { labelKey: "sidebar.menu.simVehicular", icon: "◻", route: ROUTES.SIM_VEHICULAR },
    { labelKey: "sidebar.menu.bicicleta", icon: "◎", route: ROUTES.EXP_BICICLETA },
    { labelKey: "sidebar.menu.analisis", icon: "◱", route: ROUTES.ANALISIS, soon: true },
    { labelKey: "sidebar.menu.configuracion", icon: "◎", route: ROUTES.CONFIGURACION, soon: true },
    { labelKey: "sidebar.menu.about", icon: "◯", route: ROUTES.ABOUT },
  ];
}

/* Barra inferior móvil: los dos modos que sí están en alcance este
   semestre (vehicular + bicicleta), Inicio, y todo lo demás en "Más". */
function buildBottomNav() {
  return [
    { labelKey: "sidebar.menu.home", icon: "⬡", route: ROUTES.DASHBOARD },
    { labelKey: "sidebar.bottomNav.vehicular", icon: "◻", route: ROUTES.SIM_VEHICULAR },
    { labelKey: "sidebar.bottomNav.bicicleta", icon: "◎", route: ROUTES.EXP_BICICLETA },
  ];
}

function buildMoreItems() {
  return [
    { labelKey: "sidebar.menu.analisis", icon: "◱", route: ROUTES.ANALISIS, soon: true },
    { labelKey: "sidebar.menu.configuracion", icon: "◎", route: ROUTES.CONFIGURACION, soon: true },
    { labelKey: "sidebar.menu.about", icon: "◯", route: ROUTES.ABOUT },
  ];
}

export default function Sidebar({ currentRoute, navigate, isOpen, onToggle, t = (key) => key }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const MENU = buildMenu(t);
  const BOTTOM_NAV = buildBottomNav();
  const MORE_ITEMS = buildMoreItems();

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
              <span className="logo-sub">{t("sidebar.logoSub")}</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {MENU.map((item) => (
            <button
              key={item.route}
              className={`nav-item top-level ${currentRoute === item.route ? "active" : ""} ${item.soon ? "soon" : ""}`}
              onClick={() => navigate(item.route)}
              title={!isOpen ? t(item.labelKey) : ""}
            >
              <span className="nav-icon">{item.icon}</span>
              {isOpen && (
                <>
                  <span className="nav-label">{t(item.labelKey)}</span>
                  {item.soon && <span className="soon-badge">{t("sidebar.soon")}</span>}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isOpen && (
            <div className="keyboard-hints">
              <span>{t("sidebar.hints.navigate")}</span>
              <span>{t("sidebar.hints.home")}</span>
              <span>{t("sidebar.hints.menu")}</span>
            </div>
          )}
          <button className="toggle-btn" onClick={onToggle} title={t("sidebar.toggleTitle")}>
            {isOpen ? "◂" : "▸"}
          </button>
        </div>
      </aside>

      {/* ── BARRA INFERIOR: móvil (vehicular / bici) ── */}
      <nav className="bottom-nav" aria-label="Navegación principal">
        {BOTTOM_NAV.map((item) => (
          <button
            key={item.route}
            className={`bottom-nav-item ${currentRoute === item.route ? "active" : ""}`}
            onClick={() => goTo(item.route)}
          >
            <span className="bottom-nav-icon">{item.icon}</span>
            <span className="bottom-nav-label">{t(item.labelKey)}</span>
          </button>
        ))}
        <button
          className={`bottom-nav-item ${isMoreActive || moreOpen ? "active" : ""}`}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span className="bottom-nav-icon">⋯</span>
          <span className="bottom-nav-label">{t("sidebar.more")}</span>
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
                <span>{t(item.labelKey)}</span>
                {item.soon && <span className="soon-badge">{t("sidebar.soon")}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}