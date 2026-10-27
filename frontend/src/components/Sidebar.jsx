import { useState } from "react";
import { ROUTES } from "../Routes";
import { perfilDe, tr } from "../config/perfiles";
import VehicleIcon from "./VehicleIcon";
import "../styles/sidebar.css";

/* El menú depende del tipo de usuario: cada uno ve SU modo principal
   (bicicleta → Modo bicicleta; carro/moto → Simulación vehicular).
   El otro modo se abre desde el Inicio. */
function buildMenu(perfil) {
  return [
    { labelKey: "sidebar.menu.home", icon: "⬡", route: ROUTES.DASHBOARD },
    { labelKey: perfil.menuKey, vehicle: perfil.id, route: perfil.route },
    { labelKey: "sidebar.menu.analisis", icon: "◱", route: ROUTES.ANALISIS, soon: true },
    { labelKey: "sidebar.menu.configuracion", icon: "⚙", route: ROUTES.CONFIGURACION },
    { labelKey: "sidebar.menu.about", icon: "◯", route: ROUTES.ABOUT },
  ];
}

function buildBottomNav(perfil) {
  return [
    { labelKey: "sidebar.menu.home", icon: "⬡", route: ROUTES.DASHBOARD },
    { labelKey: perfil.bottomKey, vehicle: perfil.id, route: perfil.route },
  ];
}

function buildMoreItems() {
  return [
    { labelKey: "sidebar.menu.analisis", icon: "◱", route: ROUTES.ANALISIS, soon: true },
    { labelKey: "sidebar.menu.configuracion", icon: "⚙", route: ROUTES.CONFIGURACION },
    { labelKey: "sidebar.menu.about", icon: "◯", route: ROUTES.ABOUT },
  ];
}

const Icono = ({ item, size }) =>
  item.vehicle ? <VehicleIcon tipo={item.vehicle} size={size} /> : <>{item.icon}</>;

export default function Sidebar({ currentRoute, navigate, isOpen, onToggle, user, t = (key) => key }) {
  const [moreOpen, setMoreOpen] = useState(false);

  const perfil = perfilDe(user);
  const MENU = buildMenu(perfil);
  const BOTTOM_NAV = buildBottomNav(perfil);
  const MORE_ITEMS = buildMoreItems();

  const goTo = (route) => {
    setMoreOpen(false);
    navigate(route);
  };

  const isMoreActive = MORE_ITEMS.some((item) => item.route === currentRoute);
  const nombre = user?.name || "Usuario";
  const iniciales = user?.initials || "US";

  return (
    <>
      {/* ── SIDEBAR: escritorio ── */}
      <aside className={`sb ${isOpen ? "sb-open" : "sb-closed"}`}>
        <button
          className="sb-logo"
          onClick={() => navigate(ROUTES.DASHBOARD)}
          title={!isOpen ? "I.D.A.S" : undefined}
        >
          {isOpen ? (
            <span className="sb-logo-text">
              <span className="sb-logo-main">IDAS</span>
              <span className="sb-logo-sub">{t("sidebar.logoSub")}</span>
            </span>
          ) : (
            <span className="sb-logo-mark">⬡</span>
          )}
        </button>

        <nav className="sb-nav" aria-label="Navegación principal">
          {MENU.map((item) => (
            <button
              key={item.route}
              className={`sb-item${currentRoute === item.route ? " active" : ""}`}
              onClick={() => navigate(item.route)}
              title={!isOpen ? t(item.labelKey) : undefined}
              aria-current={currentRoute === item.route ? "page" : undefined}
            >
              <span className="sb-item-icon"><Icono item={item} size={20} /></span>
              {isOpen && (
                <>
                  <span className="sb-item-label">{t(item.labelKey)}</span>
                  {item.soon && <span className="sb-soon">{t("sidebar.soon")}</span>}
                </>
              )}
            </button>
          ))}
        </nav>

        <div className="sb-footer">
          <div className="sb-user" title={!isOpen ? `${nombre} · ${perfil.label}` : undefined}>
            <span className="sb-avatar">{iniciales}</span>
            {isOpen && (
              <span className="sb-user-body">
                <span className="sb-user-name">{nombre}</span>
                <span className="sb-user-type">
                  <VehicleIcon tipo={perfil.id} size={14} />
                  {tr(t, `profile.${perfil.id}`, perfil.label)}
                </span>
              </span>
            )}
          </div>

          <div className="sb-bottom-row">
            {isOpen && (
              <span className="sb-status">
                <span className="sb-dot" />
                {t("topbar.systemActive")}
              </span>
            )}
            <button
              className="sb-toggle"
              onClick={onToggle}
              title={t("sidebar.toggleTitle")}
              aria-label={t("sidebar.toggleTitle")}
            >
              {isOpen ? "◂" : "▸"}
            </button>
          </div>
        </div>
      </aside>

      {/* ── BARRA INFERIOR: móvil ── */}
      <nav className="bottom-nav" aria-label="Navegación principal">
        {BOTTOM_NAV.map((item) => (
          <button
            key={item.route}
            className={`bottom-nav-item ${currentRoute === item.route ? "active" : ""}`}
            onClick={() => goTo(item.route)}
          >
            <span className="bottom-nav-icon"><Icono item={item} size={20} /></span>
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