import { useState } from "react";
import { ROUTES } from "../routes";

const styles = `
  .settings-container {
    padding: 32px;
    color: #e6edf3;
    font-family: 'Courier New', Courier, monospace;
    max-width: 900px;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .settings-title {
    font-size: 1.4rem;
    font-weight: bold;
    color: #e6edf3;
  }

  .back-btn {
    background: transparent;
    border: 1px solid #30363d;
    color: #8b949e;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    transition: all 0.2s;
    width: auto;
  }

  .back-btn:hover {
    border-color: #58a6ff;
    color: #58a6ff;
  }

  .settings-section {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .section-title {
    font-size: 1rem;
    font-weight: bold;
    color: #58a6ff;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #21262d;
  }

  .setting-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .setting-info label {
    display: block;
    font-size: 0.9rem;
    font-weight: bold;
    color: #e6edf3;
    margin-bottom: 4px;
  }

  .setting-info span {
    font-size: 0.78rem;
    color: #8b949e;
  }

  /* Toggle switch */
  .toggle-wrapper {
    position: relative;
    width: 52px;
    height: 28px;
    flex-shrink: 0;
  }

  .toggle-wrapper input {
    opacity: 0;
    width: 0;
    height: 0;
    position: absolute;
  }

  .toggle-slider {
    position: absolute;
    inset: 0;
    background: #30363d;
    border-radius: 28px;
    cursor: pointer;
    transition: background 0.3s;
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    left: 4px;
    top: 4px;
    background: white;
    border-radius: 50%;
    transition: transform 0.3s;
  }

  .toggle-wrapper input:checked + .toggle-slider {
    background: #2563eb;
  }

  .toggle-wrapper input:checked + .toggle-slider::before {
    transform: translateX(24px);
  }

  /* Select */
  .settings-select {
    background: #0d1117;
    border: 1px solid #30363d;
    color: #e6edf3;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    outline: none;
    cursor: pointer;
    min-width: 160px;
  }

  .settings-select:focus {
    border-color: #58a6ff;
  }

  /* Slider volumen */
  .volume-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
    color: #8b949e;
  }

  .volume-slider {
    -webkit-appearance: none;
    width: 120px;
    height: 4px;
    border-radius: 4px;
    background: #30363d;
    outline: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #2563eb;
    cursor: pointer;
  }

  .save-btn {
    margin-top: 8px;
    padding: 11px 28px;
    background: #238636;
    color: white;
    border: 1px solid #2ea043;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 1px;
    transition: background 0.2s;
    width: auto;
  }

  .save-btn:hover {
    background: #2ea043;
  }
`;

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle-wrapper">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className="toggle-slider" />
    </label>
  );
}

export default function Settings({ navigate }) {
  const [settings, setSettings] = useState({
    cajas: true,
    distancia: true,
    velocidad: true,
    nocturno: false,
    alertas: true,
    volumen: 75,
    idioma: "Español",
    resolucion: "1280 × 720",
  });

  const toggle = (key) =>
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));

  const set = (key, val) =>
    setSettings((prev) => ({ ...prev, [key]: val }));

  return (
    <>
      <style>{styles}</style>
      <div className="settings-container">

        <div className="settings-header">
          <h1 className="settings-title">◎ Configuración</h1>
          <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>
            ← Inicio
          </button>
        </div>

        {/* Visualización */}
        <div className="settings-section">
          <div className="section-title">👁 Visualización</div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Mostrar Cajas de Detección</label>
              <span>Visualizar rectángulos alrededor de objetos detectados</span>
            </div>
            <Toggle checked={settings.cajas} onChange={() => toggle("cajas")} />
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Mostrar Información de Distancia</label>
              <span>Mostrar distancia en metros a objetos</span>
            </div>
            <Toggle checked={settings.distancia} onChange={() => toggle("distancia")} />
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Mostrar Información de Velocidad</label>
              <span>Mostrar velocidad de objetos en movimiento</span>
            </div>
            <Toggle checked={settings.velocidad} onChange={() => toggle("velocidad")} />
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Modo Nocturno</label>
              <span>Ajusta el brillo y contraste para conducción nocturna</span>
            </div>
            <Toggle checked={settings.nocturno} onChange={() => toggle("nocturno")} />
          </div>
        </div>

        {/* Audio */}
        <div className="settings-section">
          <div className="section-title">🔊 Audio</div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Alertas Sonoras</label>
              <span>Reproducir sonidos de alerta</span>
            </div>
            <Toggle checked={settings.alertas} onChange={() => toggle("alertas")} />
          </div>

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
        </div>

        {/* General */}
        <div className="settings-section">
          <div className="section-title">⚙ General</div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Idioma</label>
            </div>
            <select className="settings-select" value={settings.idioma}
              onChange={(e) => set("idioma", e.target.value)}>
              <option>Español</option>
              <option>English</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info">
              <label>Resolución de análisis</label>
            </div>
            <select className="settings-select" value={settings.resolucion}
              onChange={(e) => set("resolucion", e.target.value)}>
              <option>640 × 480</option>
              <option>1280 × 720</option>
              <option>1920 × 1080</option>
            </select>
          </div>
        </div>

        <button className="save-btn">✔ Guardar configuración</button>

      </div>
    </>
  );
}