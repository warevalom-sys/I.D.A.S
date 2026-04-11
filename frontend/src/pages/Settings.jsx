import { ROUTES } from "../Routes";

export default function Settings({ navigate }) {
  return (
    <div className="form-page">
      <div className="fp-header">
        <h1 className="page-title">◎ Configuración general</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
      </div>
      <div className="fp-card">
        <div className="field-row">
          <label>Idioma</label>
          <select>
            <option>Español</option>
            <option>English</option>
          </select>
        </div>
        <div className="field-row">
          <label>Tema</label>
          <select>
            <option>Oscuro</option>
            <option>Claro</option>
          </select>
        </div>
        <div className="field-row">
          <label>Resolución de análisis</label>
          <select>
            <option>640 × 480</option>
            <option>1280 × 720</option>
            <option>1920 × 1080</option>
          </select>
        </div>
        <div className="field-row">
          <label>Guardar sesiones automáticamente</label>
          <input type="checkbox" />
        </div>
        <div className="field-row">
          <label>Mostrar FPS en pantalla</label>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="field-row">
          <label>Directorio de salida</label>
          <input type="text" defaultValue="./output/" />
        </div>
        <button className="save-btn">Guardar configuración</button>
      </div>
    </div>
  );
}