import { useState, useEffect } from "react";
import { ROUTES } from "../Routes";
import { perfilDe, tr } from "../config/perfiles";
import VehicleIcon from "../components/VehicleIcon";
import { leerAjustes, guardarAjustes, probarAlerta } from "../config/ajustes";
import "../styles/settings.css";

// ─── Subcomponentes ───────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label className="st-toggle">
      <input type="checkbox" checked={checked} onChange={onChange} aria-label={label} />
      <span className="st-toggle-slider" />
    </label>
  );
}

function Row({ label, desc, children }) {
  return (
    <div className="st-row">
      <div className="st-row-info">
        <span className="st-row-label">{label}</span>
        {desc && <span className="st-row-desc">{desc}</span>}
      </div>
      <div className="st-row-control">{children}</div>
    </div>
  );
}

// Opciones tipo píldora (reemplazan a los selectores pequeños)
function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="st-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className="st-seg-btn"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="st-section">
      <div className="st-section-head">
        <div>
          <h2 className="st-section-title">{title}</h2>
          {subtitle && <p className="st-section-sub">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

const VEHICLE_FIELDS = [
  { labelKey: "settings.vehicle.marca", key: "marca" },
  { labelKey: "settings.vehicle.modelo", key: "modelo" },
  { labelKey: "settings.vehicle.anio", key: "anio" },
  { labelKey: "settings.vehicle.placa", key: "placa" },
  { labelKey: "settings.vehicle.color", key: "color" },
  { labelKey: "settings.vehicle.kilometraje", key: "kilometraje" },
];

// El perfil del vehículo se guarda en este dispositivo, por usuario (el backend
// todavía no tiene un endpoint para editarlo).
const VEHICULO_VACIO = { marca: "", modelo: "", anio: "", placa: "", color: "", kilometraje: "" };
const claveVehiculo = (usuarioId) => `idas_vehiculo_${usuarioId ?? "local"}`;

function cargarVehiculo(usuarioId) {
  try {
    const raw = localStorage.getItem(claveVehiculo(usuarioId));
    return { ...VEHICULO_VACIO, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return { ...VEHICULO_VACIO };
  }
}

function guardarVehiculo(usuarioId, datos) {
  try {
    localStorage.setItem(claveVehiculo(usuarioId), JSON.stringify(datos));
  } catch {
    /* sin almacenamiento disponible: se conserva solo mientras la pantalla esté abierta */
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────
// `user` esperado: { name, initials, modoActivo, tieneAuto, tipoVehiculo }
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
  const { name = "Usuario", initials = "US", tieneAuto = false, usuarioId } = user;

  // El tipo de usuario decide qué secciones se ven y en qué orden.
  const perfil = perfilDe(user);
  const esBici = perfil.id === "bicicleta";
  const mostrarVehiculo = tieneAuto && !esBici;

  // — Perfil del vehículo (solo carro / moto) — se guarda en este dispositivo.
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicle, setVehicle] = useState(() => cargarVehiculo(usuarioId));
  const [vehicleTemp, setVehicleTemp] = useState(() => cargarVehiculo(usuarioId));

  const handleVehicleEdit = () => {
    if (editingVehicle) {
      setVehicle({ ...vehicleTemp });
      guardarVehiculo(usuarioId, vehicleTemp);
    } else {
      setVehicleTemp({ ...vehicle });
    }
    setEditingVehicle((prev) => !prev);
  };

  // — Ajustes generales — idioma vive en App.jsx; aquí solo se propone en
  // "general.idioma" y se confirma hacia arriba al guardar.
  const [general, setGeneral] = useState(() => ({
    idioma,
    resolucion: leerAjustes().resolucion,
  }));
  const setGeneralField = (key, val) => setGeneral((prev) => ({ ...prev, [key]: val }));

  // — Ajustes de cámara y de alertas — se guardan en este dispositivo y los
  // lee CameraView en cada uso (ver config/ajustes.js).
  const [settings, setSettings] = useState(() => {
    const guardados = leerAjustes();
    return {
      camaraTrasera: guardados.camaraTrasera,
      vibracion: guardados.vibracion,
      sonido: guardados.sonido,
      volumen: guardados.volumen,
    };
  });

  const toggle = (key) => setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  const set    = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  // — Guardar configuración — persiste los ajustes en este dispositivo y
  // confirma el idioma propuesto hacia App.jsx. El tema se aplica de inmediato.
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saved"

  const handleSave = () => {
    try {
      guardarAjustes({
        resolucion: general.resolucion,
        camaraTrasera: settings.camaraTrasera,
        sonido: settings.sonido,
        volumen: settings.volumen,
        vibracion: settings.vibracion,
      });
      if (general.idioma !== idioma) {
        onIdiomaChange(general.idioma);
      }
      setSaveState("saved");
    } catch {
      setSaveState("idle");
    }
  };

  useEffect(() => {
    if (saveState !== "saved") return;
    const timer = setTimeout(() => setSaveState("idle"), 2000);
    return () => clearTimeout(timer);
  }, [saveState]);

  // ─── Secciones ──────────────────────────────────────────────────────────────
  const seccionVehiculo = mostrarVehiculo && (
    <Section
      key="vehiculo"
      title={tr(t, `settings.vehicle.title.${perfil.id}`, t("settings.vehicle.title"))}
      subtitle={t("settings.vehicle.subtitle")}
      action={
        <button
          className={`st-pill-btn${editingVehicle ? " active" : ""}`}
          onClick={handleVehicleEdit}
        >
          {editingVehicle ? t("settings.vehicle.save") : t("settings.vehicle.edit")}
        </button>
      }
    >
      <div className="st-vehicle-grid">
        {VEHICLE_FIELDS.map(({ labelKey, key }) => (
          <div className="st-field" key={key}>
            <label htmlFor={`veh-${key}`}>{t(labelKey)}</label>
            <input
              id={`veh-${key}`}
              className="st-input"
              type="text"
              placeholder="—"
              disabled={!editingVehicle}
              value={editingVehicle ? vehicleTemp[key] : vehicle[key]}
              onChange={(e) => setVehicleTemp((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
    </Section>
  );

  const seccionAlertas = (
    <Section key="alertas" title={t("settings.notifications.title")}>
      <Row label={t("settings.notifications.sound")}>
        <Toggle checked={settings.sonido} onChange={() => toggle("sonido")} label={t("settings.notifications.sound")} />
      </Row>
      {settings.sonido && (
        <Row label={`${t("settings.notifications.volume")}: ${settings.volumen}%`}>
          <div className="st-volume">
            <span>0%</span>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.volumen}
              onChange={(e) => set("volumen", Number(e.target.value))}
              aria-label={t("settings.notifications.volume")}
            />
            <span>100%</span>
          </div>
        </Row>
      )}
      <Row label={t("settings.notifications.vibration")}>
        <Toggle checked={settings.vibracion} onChange={() => toggle("vibracion")} label={t("settings.notifications.vibration")} />
      </Row>
      {(settings.sonido || settings.vibracion) && (
        <Row
          label={tr(t, "settings.notifications.test", "Probar alerta")}
          desc={tr(t, "settings.notifications.testDesc", "Suena y vibra como lo haría una alerta real.")}
        >
          <button type="button" className="st-pill-btn" onClick={() => probarAlerta(settings)}>
            {tr(t, "settings.notifications.testBtn", "Probar")}
          </button>
        </Row>
      )}
      {esBici && !settings.sonido && !settings.vibracion && (
        <p className="st-section-sub" role="alert">
          {tr(t, "settings.notifications.warnOff", "Sin sonido ni vibración no recibirás ningún aviso mientras pedaleas.")}
        </p>
      )}
    </Section>
  );

  const seccionCamara = (
    <Section key="camara" title={t("settings.camera.title")}>
      <Row label={t("settings.camera.rearDefault")}>
        <Toggle checked={settings.camaraTrasera} onChange={() => toggle("camaraTrasera")} label={t("settings.camera.rearDefault")} />
      </Row>
    </Section>
  );

  const seccionGeneral = (
    <Section key="general" title={t("settings.general.title")}>
      <Row label={t("settings.general.language")}>
        <Segmented
          ariaLabel={t("settings.general.language")}
          value={general.idioma}
          onChange={(v) => setGeneralField("idioma", v)}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "Ingles" },
          ]}
        />
      </Row>
      <Row label={t("settings.general.theme")}>
        <Segmented
          ariaLabel={t("settings.general.theme")}
          value={theme}
          onChange={(v) => { if (v !== theme) onToggleTheme(); }}
          options={[
            { value: "dark", label: t("settings.general.theme.dark") },
            { value: "light", label: t("settings.general.theme.light") },
          ]}
        />
      </Row>
      <Row
        label={t("settings.general.resolution")}
        desc={tr(t, "settings.general.resolutionDesc", "Menos resolución responde más rápido. Recomendado: 640 × 480.")}
      >
        <select
          className="st-select"
          value={general.resolucion}
          onChange={(e) => setGeneralField("resolucion", e.target.value)}
          aria-label={t("settings.general.resolution")}
        >
          <option>640 × 480</option>
          <option>1280 × 720</option>
          <option>1920 × 1080</option>
        </select>
      </Row>
    </Section>
  );

  // Orden según el tipo de usuario:
  //  · bicicleta → primero las alertas (son por sonido)
  //  · carro / moto → primero su vehículo y la pantalla
  const secciones = esBici
    ? [seccionAlertas, seccionCamara, seccionGeneral]
    : [seccionVehiculo, seccionCamara, seccionAlertas, seccionGeneral];

  return (
    <div className="settings-page st">

      {/* ── Encabezado ── */}
      <header className="st-header">
        <h1 className="st-h1">{t("settings.title")}</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
          {t("settings.back")}
        </button>
      </header>

      {/* ── Perfil ── */}
      <div className="st-profile">
        <div className="st-avatar">{initials}</div>
        <div className="st-profile-body">
          <div className="st-profile-name">{name}</div>
          <div className="st-profile-meta">
            <span className="st-chip">
              <VehicleIcon tipo={perfil.id} size={14} />
              {tr(t, `profile.${perfil.id}`, perfil.label)}
            </span>
            <span className="st-profile-mode">{t("settings.activeMode")}: {t(perfil.titleKey)}</span>
          </div>
        </div>
      </div>

      {secciones}

      {/* ── Acerca de ── */}
      <button className="st-link-row" onClick={() => navigate(ROUTES.ABOUT)}>
        <span>{t("settings.about")}</span>
        <span aria-hidden="true">›</span>
      </button>

      <button className="st-save" onClick={handleSave}>
        {saveState === "saved" ? t("settings.saved") : t("settings.save")}
      </button>

    </div>
  );
}