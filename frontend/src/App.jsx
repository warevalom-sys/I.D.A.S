import { useState, useEffect, useCallback } from "react";
import { ROUTES } from "./Routes";
import { useTranslation } from "./i18n/translations";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import CameraView from "./pages/CameraView";
import UnderConstruction from "./components/UnderConstruction";
import About from "./pages/About";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import "./styles/App.css";

const NAVIGABLE_ROUTES = Object.values(ROUTES);
const THEME_KEY = "idas_theme";
const IDIOMA_KEY = "idas_idioma";

const SESION_INICIAL = {
  modo: null,          // null = sin sesión activa; si no, "vehicular" | "video" | "bicicleta"
  objetosDetectados: 0,
  alertas: 0,
  fps: "—",
  estado: "inactivo",  // clave: "inactivo" | "pausado" | "analizando" | "riesgoAlto"
};

// Adapta la respuesta de /api/auth/login|registro (usuario_id, nombre,
// modo_preferido, tiene_auto) a la forma que esperan Dashboard y Settings
// (name, initials, modoActivo, tieneAuto) — sin cambiar esos componentes.
function adaptarUsuario(datos) {
  if (!datos) return null;
  const iniciales = (datos.nombre || "US")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    usuarioId: datos.usuario_id,
    name: datos.nombre,
    initials: iniciales,
    modoActivo: datos.modo_preferido,
    tieneAuto: datos.tiene_auto,
  };
}

function cargarUsuarioGuardado() {
  try {
    const raw = localStorage.getItem("idas_usuario");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cargarTema() {
  try {
    return localStorage.getItem(THEME_KEY) || "dark";
  } catch {
    return "dark";
  }
}

function cargarIdioma() {
  try {
    return localStorage.getItem(IDIOMA_KEY) || "es";
  } catch {
    return "es";
  }
}

export default function App() {
  const [usuarioRaw, setUsuarioRaw] = useState(cargarUsuarioGuardado);
  const usuario = adaptarUsuario(usuarioRaw);

  const [currentRoute, setCurrentRoute] = useState(
    usuario ? ROUTES.DASHBOARD : ROUTES.LOGIN
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // — Tema (claro/oscuro) — aplicado globalmente vía atributo data-theme en <html> —
  const [theme, setTheme] = useState(cargarTema);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage no disponible
    }
  }, [theme]);
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  // — Idioma — fuente de verdad global; Settings solo lo propone y confirma —
  const [idioma, setIdioma] = useState(cargarIdioma);
  useEffect(() => {
    try {
      localStorage.setItem(IDIOMA_KEY, idioma);
    } catch {
      // localStorage no disponible
    }
  }, [idioma]);
  const t = useTranslation(idioma);

  const [sesion, setSesion] = useState(SESION_INICIAL);

  const navigate = useCallback((route) => {
    setCurrentRoute(route);
    if (route === ROUTES.DASHBOARD) {
      setSesion(SESION_INICIAL);
    }
  }, []);

  const handleLoginSuccess = useCallback((datosUsuario) => {
    setUsuarioRaw(datosUsuario);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("idas_usuario");
    setUsuarioRaw(null);
    navigate(ROUTES.LOGIN);
  }, [navigate]);

  useEffect(() => {
    const handleKey = (e) => {
      if (currentRoute === ROUTES.LOGIN) return;
      const idx = NAVIGABLE_ROUTES.indexOf(currentRoute);
      if (e.key === "ArrowDown" && idx < NAVIGABLE_ROUTES.length - 1) {
        e.preventDefault();
        setCurrentRoute(NAVIGABLE_ROUTES[idx + 1]);
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        setCurrentRoute(NAVIGABLE_ROUTES[idx - 1]);
      } else if (e.key === "Home") {
        e.preventDefault();
        navigate(ROUTES.DASHBOARD);
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        navigate(ROUTES.DASHBOARD);
      } else if (e.key === "Escape") {
        navigate(ROUTES.DASHBOARD);
      } else if (e.key === "F1") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentRoute]);

  const renderPage = () => {
    switch (currentRoute) {
      case ROUTES.LOGIN:
        return <Login navigate={navigate} onLoginSuccess={handleLoginSuccess} />;
      case ROUTES.DASHBOARD:
        return <Dashboard navigate={navigate} sesion={sesion} user={usuario} t={t} />;
      case ROUTES.SIM_VEHICULAR:
        return <CameraView mode="vehicular" navigate={navigate} onSesionUpdate={setSesion} user={usuario} t={t} />;
      case ROUTES.SIM_VIDEO:
        return <CameraView mode="video" navigate={navigate} onSesionUpdate={setSesion} user={usuario} t={t} />;
      case ROUTES.EXP_BICICLETA:
        return <CameraView mode="bicicleta" navigate={navigate} onSesionUpdate={setSesion} user={usuario} t={t} />;
      case ROUTES.CONFIGURACION:
        return (
          <Settings
            navigate={navigate}
            user={usuario}
            t={t}
            theme={theme}
            onToggleTheme={toggleTheme}
            idioma={idioma}
            onIdiomaChange={setIdioma}
          />
        );
      case ROUTES.ABOUT:
        return <About navigate={navigate} t={t} />;
      default:
        return <UnderConstruction route={currentRoute} navigate={navigate} />;
    }
  };

  return (
    <div className={`app-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      {currentRoute !== ROUTES.LOGIN && (
        <Sidebar
          currentRoute={currentRoute}
          navigate={navigate}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen((v) => !v)}
          t={t}
        />
      )}
      <div className="main-area">
        {currentRoute !== ROUTES.LOGIN && (
          <Topbar
            currentRoute={currentRoute}
            navigate={navigate}
            alertCount={sesion.alertas}
            onMenuToggle={() => setSidebarOpen((v) => !v)}
            sesion={sesion}
            onLogout={handleLogout}
            t={t}
            idioma={idioma}
          />
        )}
        <main className="page-content">{renderPage()}</main>
      </div>
    </div>
  );
}