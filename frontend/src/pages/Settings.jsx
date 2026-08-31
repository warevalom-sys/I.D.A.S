import { useState } from "react";
import { ROUTES } from "../Routes";

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <label className="settings-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="settings-toggle-slider" />
    </label>
  );
}

// ─── Datos de configuración de visualización ──────────────────────────────────
const VISUAL_SETTINGS = [
  { key: "cajas",     label: "Mostrar Cajas de Detección",       desc: "Visualizar rectángulos alrededor de objetos detectados" },
  { key: "distancia", label: "Mostrar Información de Distancia", desc: "Mostrar distancia en metros a objetos" },
  { key: "velocidad", label: "Mostrar Información de Velocidad", desc: "Mostrar velocidad de objetos en movimiento" },
  { key: "nocturno",  label: "Modo Nocturno",                    desc: "Ajusta el brillo y contraste para conducción nocturna" },
];

const VEHICLE_FIELDS = [
  { label: "Marca",        key: "marca" },
  { label: "Modelo",       key: "modelo" },
  { label: "Año",          key: "anio" },
  { label: "Placa",        key: "placa" },
  { label: "Color",        key: "color" },
  { label: "Kilometraje",  key: "kilometraje" },
];

const SENSIBILIDAD_OPCIONES = ["Baja", "Media", "Alta"];

// ─── Componente principal ─────────────────────────────────────────────────────
// `user` esperado: { name, initials, modoActivo, tieneAuto }
// `tieneAuto` es mock por ahora — cuando exista la base de datos, viene del perfil real
// del cliente y decide si se muestra o no la sección de vehículo.
export default function Settings({ navigate, user = {} }) {

  const {
    name = "Usuario",
    initials = "US",
    modoActivo = "ciclista",
    tieneAuto = false,
  } = user;

  // — Perfil del vehículo (solo aplica si el cliente tiene auto registrado) —
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicle, setVehicle] = useState({
    marca:        "Tesla",
    modelo:       "Model 3",
    anio:         "2024",
    placa:        "ABC-1234",
    color:        "Blanco Perla",
    kilometraje:  "12,450",
  });
  const [vehicleTemp, setVehicleTemp] = useState({ ...vehicle });

  const handleVehicleEdit = () => {
    if (editingVehicle) {
      setVehicle({ ...vehicleTemp });
    } else {
      setVehicleTemp({ ...vehicle });
    }
    setEditingVehicle((prev) => !prev);
  };

  // — Ajustes generales —
  const [settings, setSettings] = useState({
    // Cámara
    camaraTrasera: true,
    sensibilidad:  "Media",
    cajas:      true,
    distancia:  true,
    velocidad:  true,
    nocturno:   false,
    // Notificaciones
    vibracion:  true,
    sonido:     false,
    volumen:    75,
    // General
    idioma:     "Español",
    resolucion: "1280 × 720",
  });

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  const set    = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const cycleSensibilidad = () => {
    const i = SENSIBILIDAD_OPCIONES.indexOf(settings.sensibilidad);
    set("sensibilidad", SENSIBILIDAD_OPCIONES[(i + 1) % SENSIBILIDAD_OPCIONES.length]);
  };

  return (
    <div className="settings-page">

      {/* ── Encabezado ── */}
      <div className="settings-header">
        <h1 className="page-title">Configuración</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
          ← Inicio
        </button>
      </div>

      {/* ── Perfil ── */}
      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{name}</div>
          <div className="profile-mode">Modo activo: {modoActivo}</div>
        </div>
      </div>

      {/* ── Perfil del Vehículo (solo si el cliente tiene auto) ── */}
      {tieneAuto && (
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <div className="settings-section-title">🚗 Perfil del Vehículo</div>
              <div className="settings-section-subtitle">Información general</div>
            </div>
            <button
              className={`settings-edit-btn${editingVehicle ? " active" : ""}`}
              onClick={handleVehicleEdit}
            >
              {editingVehicle ? "✔ Guardar" : "⚙ Editar"}
            </button>
          </div>

          <div className="vehicle-grid">
            {VEHICLE_FIELDS.map(({ label, key }) => (
              <div className="vehicle-field" key={key}>
                <label>{label}</label>
                <input
                  className="vehicle-input"
                  type="text"
                  disabled={!editingVehicle}
                  value={editingVehicle ? vehicleTemp[key] : vehicle[key]}
                  onChange={(e) =>
                    setVehicleTemp((prev) => ({ ...prev, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Cámara ── */}
      <div className="settings-section">
        <div className="settings-section-title">📷 Cámara</div>

        <div className="setting-row">
          <div className="setting-info">
            <label>Cámara trasera por defecto</label>
          </div>
          <Toggle checked={settings.camaraTrasera} onChange={() => toggle("camaraTrasera")} />
        </div>

        <div className="setting-row setting-row-clickable" onClick={cycleSensibilidad}>
          <div className="setting-info">
            <label>Sensibilidad de alerta</label>
          </div>
          <span className="setting-value">{settings.sensibilidad} ›</span>
        </div>

        {VISUAL_SETTINGS.map(({ key, label, desc }) => (
          <div className="setting-row" key={key}>
            <div className="setting-info">
              <label>{label}</label>
              <span>{desc}</span>
            </div>
            <Toggle checked={settings[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      {/* ── Notificaciones ── */}
      <div className="settings-section">
        <div className="settings-section-title">🔔 Notificaciones</div>

        <div className="setting-row">
          <div className="setting-info">
            <label>Vibración en riesgo alto</label>
          </div>
          <Toggle checked={settings.vibracion} onChange={() => toggle("vibracion")} />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <label>Sonido</label>
          </div>
          <Toggle checked={settings.sonido} onChange={() => toggle("sonido")} />
        </div>

        {settings.sonido && (
          <div className="setting-row">
            <div className="setting-info">
              <label>Volumen de Alertas: {settings.volumen}%</label>
            </div>
            <div className="volume-wrapper">
              <span>0%</span>
              <input
                type="range"
                className="volume-slider"
                min={0} max={100}
                value={settings.volumen}
                onChange={(e) => set("volumen", Number(e.target.value))}
              />
              <span>100%</span>
            </div>
          </div>
        )}
      </div>

      {/* ── General ── */}
      <div className="settings-section">
        <div className="settings-section-title">⚙ General</div>

        <div className="setting-row">
          <div className="setting-info"><label>Idioma</label></div>
          <select
            className="settings-select"
            value={settings.idioma}
            onChange={(e) => set("idioma", e.target.value)}
          >
            <option>Español</option>
            <option>English</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info"><label>Resolución de análisis</label></div>
          <select
            className="settings-select"
            value={settings.resolucion}
            onChange={(e) => set("resolucion", e.target.value)}
          >
            <option>640 × 480</option>
            <option>1280 × 720</option>
            <option>1920 × 1080</option>
          </select>
        </div>
      </div>

      {/* ── Acerca de ── */}
      <button className="settings-link-row" onClick={() => navigate(ROUTES.ABOUT)}>
        <span>ⓘ Acerca de COLVIS</span>
        <span>›</span>
      </button>

      <button className="save-btn">✔ Guardar configuración</button>

    </div>
  );
}