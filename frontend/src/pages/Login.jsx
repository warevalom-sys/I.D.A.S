import { useState, useEffect } from "react";
import { ROUTES } from "../routes";
 
// ─── Usuarios predefinidos ───────────────────────────────────────────────────
const USUARIOS_PREDEFINIDOS = [
  { usuario: "moto_user",  password: "1234", tipo: "Motocicleta" },
  { usuario: "carro_user", password: "1234", tipo: "Carro" },
  { usuario: "bici_user",  password: "1234", tipo: "Bicicleta" },
  { usuario: "peaton",     password: "1234", tipo: "A pie" },
];
 
// ─── Estilos ─────────────────────────────────────────────────────────────────
const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2);   opacity: 0; }
  }
  @keyframes scanline {
    0%   { top: -4px; }
    100% { top: calc(100% + 4px); }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50%       { transform: translateY(-6px); }
  }
 
  * { box-sizing: border-box; margin: 0; padding: 0; }
 
  .lx-bg {
    min-height: 100vh;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #090d13;
    font-family: 'Courier New', Courier, monospace;
    position: relative;
    overflow: hidden;
    padding: 24px;
  }
 
  /* Grilla de fondo */
  .lx-bg::before {
    content: '';
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(88,166,255,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(88,166,255,0.04) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }
 
  .lx-scanline {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(88,166,255,0.12), transparent);
    animation: scanline 7s linear infinite;
    pointer-events: none;
    z-index: 0;
  }
 
  .lx-glow {
    position: absolute;
    width: 500px; height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(35,134,54,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
 
  /* Contenedor principal */
  .lx-wrap {
    display: flex;
    z-index: 1;
    width: 820px;
    max-width: 100%;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #30363d;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    animation: fadeInUp 0.5s ease both;
  }
 
  /* ── Panel izquierdo ── */
  .lx-left {
    width: 300px;
    flex-shrink: 0;
    background: linear-gradient(160deg, #0d1f3c 0%, #0d1117 100%);
    padding: 40px 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid #21262d;
    position: relative;
    overflow: hidden;
  }
 
  .lx-left::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(88,166,255,0.1) 0%, transparent 70%);
    pointer-events: none;
  }
 
  .lx-brand { animation: float 4s ease-in-out infinite; }
 
  .lx-logo {
    font-size: 2.6rem;
    font-weight: 900;
    letter-spacing: 5px;
    background: linear-gradient(135deg, #58a6ff, #3fb950);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }
 
  .lx-logoname {
    font-size: 0.6rem;
    color: #8b949e;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 6px;
  }
 
  .lx-version {
    display: inline-block;
    margin-top: 10px;
    font-size: 0.6rem;
    color: #3fb950;
    border: 1px solid #238636;
    padding: 2px 8px;
    border-radius: 20px;
    letter-spacing: 1px;
  }
 
  .lx-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
 
  .lx-features li {
    font-size: 0.72rem;
    color: #8b949e;
    display: flex;
    align-items: center;
    gap: 9px;
  }
 
  .lx-features li::before {
    content: '';
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #58a6ff;
    flex-shrink: 0;
    box-shadow: 0 0 5px #58a6ff;
  }
 
  .lx-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.65rem;
    color: #8b949e;
  }
 
  .lx-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #3fb950;
    box-shadow: 0 0 7px #3fb950;
    flex-shrink: 0;
    position: relative;
  }
 
  .lx-dot::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid #3fb950;
    animation: pulse-ring 2s ease-out infinite;
  }
 
  /* ── Panel derecho ── */
  .lx-right {
    flex: 1;
    background: #161b22;
    padding: 40px 36px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
 
  .lx-form-title {
    font-size: 1.05rem;
    font-weight: bold;
    color: #e6edf3;
    margin-bottom: 4px;
  }
 
  .lx-cursor {
    display: inline-block;
    animation: blink 1s step-end infinite;
    color: #58a6ff;
    margin-left: 1px;
  }
 
  .lx-form-sub {
    font-size: 0.72rem;
    color: #8b949e;
    margin-bottom: 20px;
    letter-spacing: 0.5px;
  }
 
  /* Tabs */
  .lx-tabs {
    display: flex;
    margin-bottom: 20px;
    border-bottom: 1px solid #30363d;
  }
 
  .lx-tab {
    flex: 1;
    padding: 9px;
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.8rem;
    letter-spacing: 1px;
    transition: color 0.2s;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }
 
  .lx-tab.active {
    color: #58a6ff;
    border-bottom: 2px solid #58a6ff;
  }
 
  /* Hint de usuarios */
  .lx-hint {
    background: rgba(88,166,255,0.06);
    border: 1px solid rgba(88,166,255,0.15);
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 14px;
    font-size: 0.68rem;
    color: #8b949e;
    line-height: 1.9;
  }
 
  .lx-hint span { color: #58a6ff; }
 
  /* Inputs */
  .lx-input-wrap { margin-bottom: 14px; }
 
  .lx-label {
    display: block;
    font-size: 0.65rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
  }
 
  .lx-input, .lx-select {
    width: 100%;
    padding: 10px 13px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 7px;
    color: #e6edf3;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    outline: none;
    transition: all 0.2s;
  }
 
  .lx-input:focus, .lx-select:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88,166,255,0.12);
  }
 
  .lx-input::placeholder { color: #484f58; }
  .lx-select { cursor: pointer; }
 
  /* Mensajes */
  .lx-error {
    background: rgba(248,81,73,0.1);
    border: 1px solid rgba(248,81,73,0.3);
    border-radius: 6px;
    padding: 9px 13px;
    font-size: 0.74rem;
    color: #f85149;
    margin-bottom: 14px;
  }
 
  .lx-success {
    background: rgba(63,185,80,0.1);
    border: 1px solid rgba(63,185,80,0.3);
    border-radius: 6px;
    padding: 9px 13px;
    font-size: 0.74rem;
    color: #3fb950;
    margin-bottom: 14px;
  }
 
  /* Botón principal */
  .lx-btn {
    width: 100%;
    padding: 11px;
    margin-top: 4px;
    background: linear-gradient(135deg, #238636, #2ea043);
    color: #fff;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 2px;
    transition: all 0.2s;
  }
 
  .lx-btn:hover {
    background: linear-gradient(135deg, #2ea043, #3fb950);
    transform: translateY(-1px);
    box-shadow: 0 5px 18px rgba(46,160,67,0.35);
  }
 
  .lx-btn:active  { transform: translateY(0); }
  .lx-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
 
  /* Responsive: ocultar panel izquierdo en móvil */
  @media (max-width: 600px) {
    .lx-left { display: none; }
  }
`;
 
// ─── Componente ───────────────────────────────────────────────────────────────
export default function Login({ navigate }) {
  const [tab,      setTab]      = useState("login");
  const [typed,    setTyped]    = useState("");
 
  // Login
  const [lUser,    setLUser]    = useState("");
  const [lPass,    setLPass]    = useState("");
  const [loading,  setLoading]  = useState(false);
 
  // Registro
  const [rUser,    setRUser]    = useState("");
  const [rPass,    setRPass]    = useState("");
  const [rConf,    setRConf]    = useState("");
  const [rTipo,    setRTipo]    = useState("Carro");
 
  // Mensajes y usuarios
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [usuarios, setUsuarios] = useState(USUARIOS_PREDEFINIDOS);
 
  // Typewriter
  const tagline = "Acceso al sistema";
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setTyped(tagline.slice(0, i + 1));
      i++;
      if (i >= tagline.length) clearInterval(iv);
    }, 65);
    return () => clearInterval(iv);
  }, []);
 
  const clearMsgs = () => { setError(""); setSuccess(""); };
 
  const switchTab = (t) => { setTab(t); clearMsgs(); };
 
  // ── Login ──
  const handleLogin = (e) => {
    e.preventDefault();
    clearMsgs();
    if (!lUser || !lPass) { setError("Completa todos los campos."); return; }
 
    setLoading(true);
    setTimeout(() => {
      const found = usuarios.find(u => u.usuario === lUser && u.password === lPass);
      if (found) {
        navigate(ROUTES.DASHBOARD);
      } else {
        setError("Usuario o contraseña incorrectos.");
        setLoading(false);
      }
    }, 800);
  };
 
  // ── Registro ──
  const handleRegistro = (e) => {
    e.preventDefault();
    clearMsgs();
    if (!rUser || !rPass || !rConf)      { setError("Completa todos los campos.");               return; }
    if (rPass !== rConf)                  { setError("Las contraseñas no coinciden.");              return; }
    if (rPass.length < 4)                 { setError("La contraseña debe tener al menos 4 caracteres."); return; }
    if (usuarios.find(u => u.usuario === rUser)) { setError("El usuario ya existe.");             return; }
 
    setUsuarios(prev => [...prev, { usuario: rUser, password: rPass, tipo: rTipo }]);
    setSuccess(`Usuario "${rUser}" creado. Ahora puedes iniciar sesión.`);
    setRUser(""); setRPass(""); setRConf(""); setRTipo("Carro");
    setTimeout(() => { switchTab("login"); }, 1200);
  };
 
  return (
    <>
      <style>{styles}</style>
      <div className="lx-bg">
        <div className="lx-scanline" />
        <div className="lx-glow" />
 
        <div className="lx-wrap">
 
          {/* ── Panel izquierdo ── */}
          <div className="lx-left">
            <div className="lx-brand">
              <div className="lx-logo">IDSS</div>
              <div className="lx-logoname">Intelligent Driving Support System</div>
              <span className="lx-version">v0.1 · PROTOTIPO</span>
            </div>
 
            <ul className="lx-features">
              <li>Detección de objetos en tiempo real</li>
              <li>Simulación vehicular avanzada</li>
              <li>Modo peatón y bicicleta</li>
              <li>Alertas inteligentes de conducción</li>
              <li>Panel de análisis integrado</li>
            </ul>
 
            <div className="lx-status-row">
              <span className="lx-dot" />
              Sistema activo · v0.1 · Prototipo
            </div>
          </div>
 
          {/* ── Panel derecho ── */}
          <div className="lx-right">
            <div className="lx-form-title">
              {typed}<span className="lx-cursor">|</span>
            </div>
            <div className="lx-form-sub">Ingresa tus credenciales para continuar</div>
 
            {/* Tabs */}
            <div className="lx-tabs">
              <button
                className={`lx-tab${tab === "login" ? " active" : ""}`}
                onClick={() => switchTab("login")}
              >
                Iniciar sesión
              </button>
              <button
                className={`lx-tab${tab === "registro" ? " active" : ""}`}
                onClick={() => switchTab("registro")}
              >
                Crear cuenta
              </button>
            </div>
 
            {error   && <div className="lx-error">{error}</div>}
            {success && <div className="lx-success">{success}</div>}
 
            {/* ── Login ── */}
            {tab === "login" && (
              <>
                <div className="lx-hint">
                  Usuarios de prueba (contraseña: <span>1234</span>)<br />
                  <span>moto_user</span> · <span>carro_user</span> · <span>bici_user</span> · <span>peaton</span>
                </div>
 
                <form onSubmit={handleLogin}>
                  <div className="lx-input-wrap">
                    <label className="lx-label">Usuario</label>
                    <input
                      className="lx-input"
                      type="text"
                      placeholder="Ingresa tu usuario"
                      value={lUser}
                      onChange={e => { setLUser(e.target.value); clearMsgs(); }}
                      onKeyDown={e => e.key === "Enter" && document.getElementById("lx-pass")?.focus()}
                      autoFocus
                    />
                  </div>
                  <div className="lx-input-wrap">
                    <label className="lx-label">Contraseña</label>
                    <input
                      id="lx-pass"
                      className="lx-input"
                      type="password"
                      placeholder="••••••••"
                      value={lPass}
                      onChange={e => { setLPass(e.target.value); clearMsgs(); }}
                    />
                  </div>
                  <button className="lx-btn" type="submit" disabled={loading}>
                    {loading ? "VERIFICANDO..." : "▶ INICIAR SESIÓN"}
                  </button>
                </form>
              </>
            )}
 
            {/* ── Registro ── */}
            {tab === "registro" && (
              <form onSubmit={handleRegistro}>
                <div className="lx-input-wrap">
                  <label className="lx-label">Usuario</label>
                  <input
                    className="lx-input"
                    type="text"
                    placeholder="Elige un nombre de usuario"
                    value={rUser}
                    onChange={e => { setRUser(e.target.value); clearMsgs(); }}
                  />
                </div>
                <div className="lx-input-wrap">
                  <label className="lx-label">Contraseña</label>
                  <input
                    className="lx-input"
                    type="password"
                    placeholder="••••••••"
                    value={rPass}
                    onChange={e => { setRPass(e.target.value); clearMsgs(); }}
                  />
                </div>
                <div className="lx-input-wrap">
                  <label className="lx-label">Confirmar contraseña</label>
                  <input
                    className="lx-input"
                    type="password"
                    placeholder="••••••••"
                    value={rConf}
                    onChange={e => { setRConf(e.target.value); clearMsgs(); }}
                  />
                </div>
                <div className="lx-input-wrap">
                  <label className="lx-label">Tipo de vehículo</label>
                  <select
                    className="lx-select"
                    value={rTipo}
                    onChange={e => setRTipo(e.target.value)}
                  >
                    <option>Carro</option>
                    <option>Motocicleta</option>
                    <option>Bicicleta</option>
                    <option>A pie</option>
                  </select>
                </div>
                <button className="lx-btn" type="submit">
                  ✔ CREAR CUENTA
                </button>
              </form>
            )}
          </div>
 
        </div>
      </div>
    </>
  );
}