import { ROUTES } from "../routes";

export function CarProfile({ navigate }) {
  return (
    <div className="form-page">
      <div className="fp-header">
        <h1 className="page-title">◈ Mi vehículo</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
      </div>
      <div className="fp-card">
        <div className="field-row">
          <label>Marca</label>
          <input type="text" placeholder="Ej: Toyota" defaultValue="" />
        </div>
        <div className="field-row">
          <label>Modelo</label>
          <input type="text" placeholder="Ej: Corolla" />
        </div>
        <div className="field-row">
          <label>Año</label>
          <input type="number" placeholder="Ej: 2020" />
        </div>
        <div className="field-row">
          <label>Color</label>
          <input type="text" placeholder="Ej: Blanco" />
        </div>
        <div className="field-row">
          <label>Placa</label>
          <input type="text" placeholder="ABC-123" />
        </div>
        <div className="field-row">
          <label>Modo de uso</label>
          <select>
            <option>Simulación vehicular</option>
            <option>Experimental (peatón)</option>
            <option>Experimental (bicicleta)</option>
          </select>
        </div>
        <button className="save-btn">Guardar perfil</button>
      </div>
    </div>
  );
}

export default CarProfile;