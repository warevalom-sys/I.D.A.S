import { useState, useEffect } from "react";
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

// ─── Datos de configuración de visualización (claves de traducción, no texto) ─
const VISUAL_SETTINGS = [
  { key: "cajas", labelKey: "settings.visual.cajas.label", descKey: "settings.visual.cajas.desc" },
  { key: "distancia", labelKey: "settings.visual.distancia.label", descKey: "settings.visual.distancia.desc" },
  { key: "velocidad", labelKey: "settings.visual.velocidad.label", descKey: "settings.visual.velocidad.desc" },
  { key: "nocturno", labelKey: "settings.visual.nocturno.label", descKey: "settings.visual.nocturno.desc" },
];

const VEHICLE_FIELDS = [
  { labelKey: "settings.vehicle.marca", key: "marca" },
  { labelKey: "settings.vehicle.modelo", key: "modelo" },
  { labelKey: "settings.vehicle.anio", key: "anio" },
  { labelKey: "settings.vehicle.placa", key: "placa" },
  { labelKey: "settings.vehicle.color", key: "color" },
  { labelKey: "settings.vehicle.kilometraje", key: "kilometraje" },
];

// Valores internos sin traducir (compatibilidad con lo que espere el backend);
// la traducción solo afecta lo que se muestra.
const SENSIBILIDAD_OPCIONES = ["Baja", "Media", "Alta"];
const SENSIBILIDAD_KEYS = {
  Baja: "settings.sensitivity.baja",
  Media: "settings.sensitivity.media",
  Alta: "settings.sensitivity.alta",
};

// Único apartado funcional por ahora además de tema/idioma: la resolución.
// Cámara/Vehículo/Notificaciones quedan en estado local sin persistir hasta backend.
const GENERAL_STORAGE_KEY = "idas_settings_general";

function loadGeneralSettings() {
  try {
    const raw = localStorage.getItem(GENERAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
// `user` esperado: { name, initials, modoActivo, tieneAuto }
// `theme`/`onToggleTheme` e `idioma`/`onIdiomaChange` vienen de App.jsx (fuente de verdad global).
export default function Settings({
  navigate,
  user = {},
  t = (key) => key,
  theme = "dark",
  onToggleTheme = () => {},
  idioma = "es",
  onIdiomaChange = () => {},
}) {

  const {
    name = "Usuario",
    initials = "US",
    modoActivo = "ciclista",
    tieneAuto = false,
  } = user;

  // — Perfil del vehículo (solo aplica si el cliente tiene auto registrado) —
  // Sin tocar: sigue siendo solo estado local, no persiste todavía.
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

  // — Ajustes generales — idioma vive en App.jsx; aquí solo se propone en
  // "general.idioma" y se confirma hacia arriba al guardar. Resolución sigue
  // siendo local + persistida en localStorage, como antes.
  const [general, setGeneral] = useState(() => {
    const saved = loadGeneralSettings();
    return {
      idioma,
      resolucion: saved?.resolucion ?? "1280 × 720",
    };
  });
  const setGeneralField = (key, val) => setGeneral((prev) => ({ ...prev, [key]: val }));

  // — Ajustes de cámara / notificaciones — sin tocar: solo estado local,
  // esperando a que se estructure el backend correspondiente.
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
  });

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  const set    = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const cycleSensibilidad = () => {
    const i = SENSIBILIDAD_OPCIONES.indexOf(settings.sensibilidad);
    set("sensibilidad", SENSIBILIDAD_OPCIONES[(i + 1) % SENSIBILIDAD_OPCIONES.length]);
  };

  // — Guardar configuración — persiste resolución localmente y confirma el
  // idioma propuesto hacia App.jsx. El tema se aplica de inmediato (no espera a Guardar).
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saved"

  const handleSave = () => {
    try {
      localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify({ resolucion: general.resolucion }));
      if (general.idioma !== idioma) {
        onIdiomaChange(general.idioma);
      }
      setSaveState("saved");
    } catch {
      // localStorage no disponible (modo privado, cuota llena, etc.)
      setSaveState("idle");
    }
  };

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [saveState]);

  return (
    <div className="settings-page">

      {/* ── Encabezado ── */}
      <div className="settings-header">
        <h1 className="page-title">{t("settings.title")}</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
          {t("settings.back")}
        </button>
      </div>

      {/* ── Perfil ── */}
      <div className="profile-header">
        <div className="profile-avatar">{initials}</div>
        <div>
          <div className="profile-name">{name}</div>
          <div className="profile-mode">{t("settings.activeMode")}: {modoActivo}</div>
        </div>
      </div>

      {/* ── Perfil del Vehículo (solo si el cliente tiene auto) — sin tocar ── */}
      {tieneAuto && (
        <div className="settings-section">
          <div className="settings-section-header">
            <div>
              <div className="settings-section-title">{t("settings.vehicle.title")}</div>
              <div className="settings-section-subtitle">{t("settings.vehicle.subtitle")}</div>
            </div>
            <button
              className={`settings-edit-btn${editingVehicle ? " active" : ""}`}
              onClick={handleVehicleEdit}
            >
              {editingVehicle ? t("settings.vehicle.save") : t("settings.vehicle.edit")}
            </button>
          </div>

          <div className="vehicle-grid">
            {VEHICLE_FIELDS.map(({ labelKey, key }) => (
              <div className="vehicle-field" key={key}>
                <label>{t(labelKey)}</label>
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

      {/* ── Cámara — sin tocar, pendiente de backend ── */}
      <div className="settings-section">
        <div className="settings-section-title">{t("settings.camera.title")}</div>

        <div className="setting-row">
          <div className="setting-info">
            <label>{t("settings.camera.rearDefault")}</label>
          </div>
          <Toggle checked={settings.camaraTrasera} onChange={() => toggle("camaraTrasera")} />
        </div>

        <div className="setting-row setting-row-clickable" onClick={cycleSensibilidad}>
          <div className="setting-info">
            <label>{t("settings.camera.sensitivity")}</label>
          </div>
          <span className="setting-value">{t(SENSIBILIDAD_KEYS[settings.sensibilidad])} ›</span>
        </div>

        {VISUAL_SETTINGS.map(({ key, labelKey, descKey }) => (
          <div className="setting-row" key={key}>
            <div className="setting-info">
              <label>{t(labelKey)}</label>
              <span>{t(descKey)}</span>
            </div>
            <Toggle checked={settings[key]} onChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      {/* ── Notificaciones — sin tocar, pendiente de backend ── */}
      <div className="settings-section">
        <div className="settings-section-title">{t("settings.notifications.title")}</div>

        <div className="setting-row">
          <div className="setting-info">
            <label>{t("settings.notifications.vibration")}</label>
          </div>
          <Toggle checked={settings.vibracion} onChange={() => toggle("vibracion")} />
        </div>

        <div className="setting-row">
          <div className="setting-info">
            <label>{t("settings.notifications.sound")}</label>
          </div>
          <Toggle checked={settings.sonido} onChange={() => toggle("sonido")} />
        </div>

        {settings.sonido && (
          <div className="setting-row">
            <div className="setting-info">
              <label>{t("settings.notifications.volume")}: {settings.volumen}%</label>
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

      {/* ── General — idioma, tema y resolución ── */}
      <div className="settings-section">
        <div className="settings-section-title">{t("settings.general.title")}</div>

        <div className="setting-row">
          <div className="setting-info"><label>{t("settings.general.language")}</label></div>
          <select
            className="settings-select"
            value={general.idioma}
            onChange={(e) => setGeneralField("idioma", e.target.value)}
          >
            <option value="es">Español</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="setting-row">
          <div className="setting-info"><label>{t("settings.general.theme")}</label></div>
          <div className="theme-toggle-wrapper">
            <span>{t("settings.general.theme.dark")}</span>
            <Toggle checked={theme === "light"} onChange={onToggleTheme} />
            <span>{t("settings.general.theme.light")}</span>
          </div>
        </div>

        <div className="setting-row">
          <div className="setting-info"><label>{t("settings.general.resolution")}</label></div>
          <select
            className="settings-select"
            value={general.resolucion}
            onChange={(e) => setGeneralField("resolucion", e.target.value)}
          >
            <option>640 × 480</option>
            <option>1280 × 720</option>
            <option>1920 × 1080</option>
          </select>
        </div>
      </div>

      {/* ── Acerca de ── */}
      <button className="settings-link-row" onClick={() => navigate(ROUTES.ABOUT)}>
        <span>{t("settings.about")}</span>
        <span>›</span>
      </button>

      <button className="save-btn" onClick={handleSave}>
        {saveState === "saved" ? t("settings.saved") : t("settings.save")}
      </button>

    </div>
  );
}