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

  .back-btn:hover { border-color: #58a6ff; color: #58a6ff; }

  .settings-section {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 1rem;
    font-weight: bold;
    color: #58a6ff;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-subtitle {
    font-size: 0.75rem;
    color: #8b949e;
    margin-top: 2px;
  }

  .edit-btn {
    background: transparent;
    border: 1px solid #30363d;
    color: #8b949e;
    padding: 7px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    transition: all 0.2s;
    width: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .edit-btn:hover { border-color: #58a6ff; color: #58a6ff; }
  .edit-btn.active { border-color: #3fb950; color: #3fb950; }

  .vehicle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .vehicle-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .vehicle-field label {
    font-size: 0.75rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .vehicle-input {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    padding: 12px 14px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s;
    width: 100%;
    box-sizing: border-box;
  }

  .vehicle-input:disabled {
    color: #8b949e;
    cursor: default;
    border-color: #21262d;
  }

  .vehicle-input:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88,166,255,0.1);
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #21262d;
  }

  .setting-row:last-child { border-bottom: none; padding-bottom: 0; }

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

  .toggle-wrapper input:checked + .toggle-slider { background: #2563eb; }
  .toggle-wrapper input:checked + .toggle-slider::before { transform: translateX(24px); }

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

  .settings-select:focus { border-color: #58a6ff; }

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

  .save-btn:hover { background: #2ea043; }
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
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [vehicle, setVehicle] = useState({
    marca: "Tesla",
    modelo: "Model 3",
    anio: "2024",
    placa: "ABC-1234",
    color: "Blanco Perla",
    kilometraje: "12,450",
  });
  const [vehicleTemp, setVehicleTemp] = useState({ ...vehicle });

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

  const toggle = (key) => setSettings((p) => ({ ...p, [key]: !p[key] }));
  const set = (key, val) => setSettings((p) => ({ ...p, [key]: val }));

  const handleVehicleEdit = () => {
    if (editingVehicle) {
      setVehicle({ ...vehicleTemp });
    } else {
      setVehicleTemp({ ...vehicle });
    }
    setEditingVehicle(!editingVehicle);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="settings-container">

        <div className="settings-header">
          <h1 className="settings-title">◎ Configuración</h1>
          <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
        </div>

        {/* 🚗 Perfil del Vehículo */}
        <div className="settings-section">
          <div className="section-header">
            <div>
              <div className="section-title">🚗 Perfil del Vehículo</div>
              <div className="section-subtitle">Información general</div>
            </div>
            <button
              className={`edit-btn ${editingVehicle ? "active" : ""}`}
              onClick={handleVehicleEdit}
            >
              {editingVehicle ? "✔ Guardar" : "⚙ Editar"}
            </button>
          </div>

          <div className="vehicle-grid">
            {[
              { label: "Marca", key: "marca" },
              { label: "Modelo", key: "modelo" },
              { label: "Año", key: "anio" },
              { label: "Placa", key: "placa" },
              { label: "Color", key: "color" },
              { label: "Kilometraje", key: "kilometraje" },
            ].map(({ label, key }) => (
              <div className="vehicle-field" key={key}>
                <label>{label}</label>
                <input
                  className="vehicle-input"
                  type="text"
                  disabled={!editingVehicle}
                  value={editingVehicle ? vehicleTemp[key] : vehicle[key]}
                  onChange={(e) =>
                    setVehicleTemp((p) => ({ ...p, [key]: e.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* 👁 Visualización */}
        <div className="settings-section">
          <div className="section-title">👁 Visualización</div>

          {[
            { key: "cajas", label: "Mostrar Cajas de Detección", desc: "Visualizar rectángulos alrededor de objetos detectados" },
            { key: "distancia", label: "Mostrar Información de Distancia", desc: "Mostrar distancia en metros a objetos" },
            { key: "velocidad", label: "Mostrar Información de Velocidad", desc: "Mostrar velocidad de objetos en movimiento" },
            { key: "nocturno", label: "Modo Nocturno", desc: "Ajusta el brillo y contraste para conducción nocturna" },
          ].map(({ key, label, desc }) => (
            <div className="setting-row" key={key}>
              <div className="setting-info">
                <label>{label}</label>
                <span>{desc}</span>
              </div>
              <Toggle checked={settings[key]} onChange={() => toggle(key)} />
            </div>
          ))}
        </div>

        {/* 🔊 Audio */}
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

        {/* ⚙ General */}
        <div className="settings-section">
          <div className="section-title">⚙ General</div>

          <div className="setting-row">
            <div className="setting-info"><label>Idioma</label></div>
            <select className="settings-select" value={settings.idioma}
              onChange={(e) => set("idioma", e.target.value)}>
              <option>Español</option>
              <option>English</option>
            </select>
          </div>

          <div className="setting-row">
            <div className="setting-info"><label>Resolución de análisis</label></div>
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