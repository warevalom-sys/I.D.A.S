import { useState, useEffect } from "react";
import { ROUTES } from "../Routes";
import { login as apiLogin, registrarUsuario } from "../services/api";

// ─── Usuarios predefinidos ───────────────────────────────────────────────────
const USUARIOS_PREDEFINIDOS = [
  { usuario: "moto_user",  password: "1234", tipo: "Motocicleta" },
  { usuario: "carro_user", password: "1234", tipo: "Carro" },
  { usuario: "bici_user",  password: "1234", tipo: "Bicicleta" },
  { usuario: "peaton",     password: "1234", tipo: "A pie" },
];

// ─── Estilos — identidad visual IDAS...
// ─── Estilos — identidad visual IDAS: acento verde-cian de marca (separado
// de los colores de severidad rojo/ámbar/verde), Quicksand para títulos,
// Nunito Sans para interfaz, bordes redondeados. ──────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@600;700;800&family=Nunito+Sans:wght@400;600;700&display=swap');

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-ring {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2);   opacity: 0; }
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
    background: #0b0f14;
    font-family: 'Nunito Sans', sans-serif;
    position: relative;
    overflow: hidden;
    padding: 24px;
  }

  .lx-glow {
    position: absolute;
    width: 560px; height: 560px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(20,184,166,0.09) 0%, transparent 70%);
    pointer-events: none;
  }

  .lx-wrap {
    display: flex;
    z-index: 1;
    width: 820px;
    max-width: 100%;
    border-radius: 28px;
    overflow: hidden;
    border: 1px solid #202932;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
    animation: fadeInUp 0.5s ease both;
  }

  .lx-left {
    width: 300px;
    flex-shrink: 0;
    background: linear-gradient(160deg, #0e2621 0%, #0f1419 100%);
    padding: 40px 30px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    border-right: 1px solid #1b232b;
    position: relative;
    overflow: hidden;
  }

  .lx-left::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .lx-brand { animation: float 4s ease-in-out infinite; }

  .lx-logo {
    font-family: 'Quicksand', sans-serif;
    font-size: 2.6rem;
    font-weight: 800;
    letter-spacing: 3px;
    background: linear-gradient(135deg, #14b8a6, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  .lx-logoname {
    font-size: 0.68rem;
    color: #8b98a1;
    letter-spacing: 1px;
    margin-top: 8px;
  }

  .lx-version {
    display: inline-block;
    margin-top: 12px;
    font-size: 0.65rem;
    font-weight: 600;
    color: #2dd4bf;
    border: 1px solid rgba(45,212,191,0.35);
    padding: 3px 10px;
    border-radius: 20px;
    letter-spacing: 0.5px;
  }

  .lx-features {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .lx-features li {
    font-size: 0.78rem;
    color: #9aa5ad;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lx-features li::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #2dd4bf;
    flex-shrink: 0;
    box-shadow: 0 0 6px rgba(45,212,191,0.7);
  }

  .lx-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.7rem;
    color: #9aa5ad;
  }

  .lx-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #2dd4bf;
    box-shadow: 0 0 7px rgba(45,212,191,0.8);
    flex-shrink: 0;
    position: relative;
  }

  .lx-dot::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid #2dd4bf;
    animation: pulse-ring 2s ease-out infinite;
  }

  .lx-right {
    flex: 1;
    background: #12171d;
    padding: 40px 36px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lx-form-title {
    font-family: 'Quicksand', sans-serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #eef2f5;
    margin-bottom: 4px;
  }

  .lx-cursor {
    display: inline-block;
    animation: blink 1s step-end infinite;
    color: #2dd4bf;
    margin-left: 1px;
  }

  .lx-form-sub {
    font-size: 0.78rem;
    color: #8b98a1;
    margin-bottom: 22px;
  }

  .lx-tabs {
    display: flex;
    margin-bottom: 22px;
    border-bottom: 1px solid #232c34;
  }

  .lx-tab {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: none;
    color: #8b98a1;
    cursor: pointer;
    font-family: 'Nunito Sans', sans-serif;
    font-weight: 600;
    font-size: 0.85rem;
    transition: color 0.2s;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .lx-tab.active {
    color: #2dd4bf;
    border-bottom: 2px solid #2dd4bf;
  }

  .lx-input-wrap { margin-bottom: 15px; }

  .lx-label {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    color: #8b98a1;
    margin-bottom: 6px;
  }

  .lx-input, .lx-select {
    width: 100%;
    padding: 11px 15px;
    background: #0d1117;
    border: 1px solid #232c34;
    border-radius: 12px;
    color: #eef2f5;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s;
  }

  .lx-input:focus, .lx-select:focus {
    border-color: #2dd4bf;
    box-shadow: 0 0 0 3px rgba(45,212,191,0.15);
  }

  .lx-input::placeholder { color: #4b5661; }
  .lx-select { cursor: pointer; }

  .lx-error {
    background: rgba(248,81,73,0.1);
    border: 1px solid rgba(248,81,73,0.3);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.8rem;
    color: #f85149;
    margin-bottom: 15px;
  }

  .lx-success {
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.3);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 0.8rem;
    color: #2dd4bf;
    margin-bottom: 15px;
  }

  .lx-btn {
    width: 100%;
    padding: 12px;
    margin-top: 4px;
    background: linear-gradient(135deg, #0d9488, #14b8a6);
    color: #fff;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    font-family: 'Nunito Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    transition: all 0.2s;
  }

  .lx-btn:hover {
    background: linear-gradient(135deg, #14b8a6, #2dd4bf);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(20,184,166,0.3);
  }

  .lx-btn:active  { transform: translateY(0); }
  .lx-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  @media (max-width: 600px) {
    .lx-left { display: none; }
  }
`;

// Tipo de vehículo → modo_preferido + tiene_auto.
// Bicicleta no cuenta como "auto" (no tiene placa/kilometraje relevante);
// Carro y Motocicleta sí, y ambos usan modo_preferido="carro".
const TIPOS_VEHICULO = [
  { value: "Bicicleta",   modoPreferido: "ciclista", tieneAuto: false },
  { value: "Carro",       modoPreferido: "carro",     tieneAuto: true  },
  { value: "Motocicleta", modoPreferido: "carro",     tieneAuto: true  },
];

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Login({ navigate, onLoginSuccess }) {
  const [tab,      setTab]      = useState("login");
  const [typed,    setTyped]    = useState("");

  // Login
  const [lEmail,   setLEmail]   = useState("");
  const [lPass,    setLPass]    = useState("");
  const [loading,  setLoading]  = useState(false);

  // Registro
  const [rNombre,  setRNombre]  = useState("");
  const [rEmail,   setREmail]   = useState("");
  const [rPass,    setRPass]    = useState("");
  const [rConf,    setRConf]    = useState("");
  const [rTipo,    setRTipo]    = useState("Carro");
  const [registrando, setRegistrando] = useState(false);

  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

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

  const guardarSesionUsuario = (datosUsuario) => {
    localStorage.setItem("idas_usuario", JSON.stringify(datosUsuario));
    onLoginSuccess?.(datosUsuario);
  };

  // ── Login ──
  const handleLogin = async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!lEmail || !lPass) { setError("Completa todos los campos."); return; }

    setLoading(true);
    try {
      const datos = await apiLogin(lEmail, lPass);
      guardarSesionUsuario(datos);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  // ── Registro ──
  const handleRegistro = async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!rNombre || !rEmail || !rPass || !rConf) { setError("Completa todos los campos."); return; }
    if (rPass !== rConf)                          { setError("Las contraseñas no coinciden."); return; }
    if (rPass.length < 4)                         { setError("La contraseña debe tener al menos 4 caracteres."); return; }

    const tipoInfo = TIPOS_VEHICULO.find((t) => t.value === rTipo);

    setRegistrando(true);
    try {
      await registrarUsuario({
        nombre: rNombre,
        email: rEmail,
        password: rPass,
        modo_preferido: tipoInfo.modoPreferido,
        tiene_auto: tipoInfo.tieneAuto,
        vehiculo: tipoInfo.tieneAuto ? { tipo: rTipo.toLowerCase() } : undefined,
      });
      setSuccess(`Cuenta creada para "${rNombre}". Ahora puedes iniciar sesión.`);
      setRNombre(""); setREmail(""); setRPass(""); setRConf(""); setRTipo("Carro");
      setTimeout(() => switchTab("login"), 1200);
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta.");
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lx-bg">
        <div className="lx-glow" />

        <div className="lx-wrap">

          {/* ── Panel izquierdo ── */}
          <div className="lx-left">
            <div className="lx-brand">
              <div className="lx-logo">IDAS</div>
              <div className="lx-logoname">Intelligent Driving Support System</div>
              <span className="lx-version">v0.1 · PROTOTIPO</span>
            </div>

            <ul className="lx-features">
              <li>Detección de objetos en tiempo real</li>
              <li>Simulación vehicular avanzada</li>
              <li>Modo bicicleta</li>
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
              <form onSubmit={handleLogin}>
                <div className="lx-input-wrap">
                  <label className="lx-label">Email</label>
                  <input
                    className="lx-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={lEmail}
                    onChange={e => { setLEmail(e.target.value); clearMsgs(); }}
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
                  {loading ? "Verificando..." : "Iniciar sesión"}
                </button>
              </form>
            )}

            {/* ── Registro ── */}
            {tab === "registro" && (
              <form onSubmit={handleRegistro}>
                <div className="lx-input-wrap">
                  <label className="lx-label">Nombre</label>
                  <input
                    className="lx-input"
                    type="text"
                    placeholder="Tu nombre"
                    value={rNombre}
                    onChange={e => { setRNombre(e.target.value); clearMsgs(); }}
                  />
                </div>
                <div className="lx-input-wrap">
                  <label className="lx-label">Email</label>
                  <input
                    className="lx-input"
                    type="email"
                    placeholder="tu@email.com"
                    value={rEmail}
                    onChange={e => { setREmail(e.target.value); clearMsgs(); }}
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
                    {TIPOS_VEHICULO.map((t) => (
                      <option key={t.value} value={t.value}>{t.value}</option>
                    ))}
                  </select>
                </div>
                <button className="lx-btn" type="submit" disabled={registrando}>
                  {registrando ? "Creando..." : "Crear cuenta"}
                </button>
              </form>
            )}
          </div>

        </div>
      </div>
    </>
  );
}