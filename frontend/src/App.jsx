import { useState, useEffect, useCallback } from "react"; // 👈 faltaban useEffect y useCallback
import { ROUTES } from "./routes";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import CameraView from "./pages/CameraView";
import UnderConstruction from "./components/UnderConstruction";
import About from "./pages/About";
import Settings from "./pages/Settings"; // 👈 agregar arriba con los imports
import Login from "./pages/login"; // 👈 faltaba este import
import "./styles/App.css";


const NAVIGABLE_ROUTES = Object.values(ROUTES);

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(ROUTES.LOGIN);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [alertCount] = useState(3);

  const navigate = useCallback((route) => {
    setCurrentRoute(route);
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      const idx = NAVIGABLE_ROUTES.indexOf(currentRoute);

      if (currentRoute === ROUTES.LOGIN) return;

      if (e.key === "ArrowDown" && idx < NAVIGABLE_ROUTES.length - 1) {
        e.preventDefault();
        setCurrentRoute(NAVIGABLE_ROUTES[idx + 1]);
      } else if (e.key === "ArrowUp" && idx > 0) {
        e.preventDefault();
        setCurrentRoute(NAVIGABLE_ROUTES[idx - 1]);
      } else if (e.key === "Home") {
        e.preventDefault();
        setCurrentRoute(ROUTES.DASHBOARD);
      } else if (e.key === "b" || e.key === "B") {
        e.preventDefault();
        setCurrentRoute(ROUTES.DASHBOARD);
      } else if (e.key === "Escape") {
        setCurrentRoute(ROUTES.DASHBOARD);
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
        return <Login navigate={navigate} />;
      case ROUTES.DASHBOARD:
        return <Dashboard navigate={navigate} alertCount={alertCount} />;
      case ROUTES.SIM_VEHICULAR:
        return <CameraView mode="vehicular" navigate={navigate} />;
      case ROUTES.SIM_VIDEO:
        return <CameraView mode="video" navigate={navigate} />;
      case ROUTES.EXP_PEATON:
        return <CameraView mode="peaton" navigate={navigate} />;
      case ROUTES.EXP_BICICLETA:
        return <CameraView mode="bicicleta" navigate={navigate} />;
      case ROUTES.ABOUT:
        return <About navigate={navigate} />;
      case ROUTES.CONFIGURACION:           // 👈 agregar esto
        return <Settings navigate={navigate} />;
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
        />
      )}

      <div className="main-area">
        {currentRoute !== ROUTES.LOGIN && (
          <Topbar
            currentRoute={currentRoute}
            navigate={navigate}
            alertCount={alertCount}
            onMenuToggle={() => setSidebarOpen((v) => !v)}
          />
        )}
        <main className="page-content">{renderPage()}</main>
      </div>
    </div>
  );
}