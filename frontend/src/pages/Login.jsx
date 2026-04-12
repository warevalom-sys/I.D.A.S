import { useState, useEffect } from "react";
import { ROUTES } from "../routes";

const styles = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse-ring {
    0% { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
  }

  @keyframes scanline {
    0% { top: -10%; }
    100% { top: 110%; }
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes glow-border {
    0%, 100% { box-shadow: 0 0 8px rgba(88,166,255,0.3), 0 0 32px rgba(88,166,255,0.1); }
    50% { box-shadow: 0 0 16px rgba(88,166,255,0.6), 0 0 48px rgba(88,166,255,0.2); }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .lx-bg {
    height: 100vh;
    width: 100vw;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #090d13;
    font-family: 'Courier New', Courier, monospace;
    position: relative;
    overflow: hidden;
  }

  /* Grid de fondo */
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

  /* Scanline animado */
  .lx-scanline {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(88,166,255,0.15), transparent);
    animation: scanline 6s linear infinite;
    pointer-events: none;
    z-index: 0;
  }

  /* Glow central */
  .lx-glow {
    position: absolute;
    width: 500px;
    height: 500px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(35,134,54,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .lx-wrap {
    display: flex;
    gap: 0;
    z-index: 1;
    animation: fadeInUp 0.6s ease both;
    width: 820px;
    border-radius: 16px;
    overflow: hidden;
    border: 1px solid #30363d;
    box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    animation: fadeInUp 0.6s ease both, glow-border 4s ease-in-out infinite;
  }

  /* Panel izquierdo — decorativo */
  .lx-left {
    width: 340px;
    flex-shrink: 0;
    background: linear-gradient(160deg, #0d1f3c 0%, #0d1117 100%);
    padding: 48px 36px;
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
    width: 200px; height: 200px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(88,166,255,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .lx-brand {
    animation: float 4s ease-in-out infinite;
  }

  .lx-logo {
    font-size: 3rem;
    font-weight: 900;
    letter-spacing: 6px;
    background: linear-gradient(135deg, #58a6ff, #3fb950);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
  }

  .lx-logoname {
    font-size: 0.65rem;
    color: #8b949e;
    letter-spacing: 2px;
    text-transform: uppercase;
    margin-top: 6px;
  }

  .lx-version {
    display: inline-block;
    margin-top: 10px;
    font-size: 0.65rem;
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
    gap: 14px;
  }

  .lx-features li {
    font-size: 0.78rem;
    color: #8b949e;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .lx-features li::before {
    content: '';
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #58a6ff;
    flex-shrink: 0;
    box-shadow: 0 0 6px #58a6ff;
  }

  .lx-status-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.7rem;
    color: #8b949e;
  }

  .lx-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: #3fb950;
    box-shadow: 0 0 8px #3fb950;
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

  /* Panel derecho — formulario */
  .lx-right {
    flex: 1;
    background: #161b22;
    padding: 48px 40px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .lx-form-title {
    font-size: 1.1rem;
    font-weight: bold;
    color: #e6edf3;
    margin-bottom: 6px;
  }

  .lx-form-sub {
    font-size: 0.75rem;
    color: #8b949e;
    margin-bottom: 32px;
    letter-spacing: 0.5px;
  }

  .lx-label {
    display: block;
    font-size: 0.7rem;
    color: #8b949e;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .lx-input-wrap {
    margin-bottom: 18px;
  }

  .lx-input {
    width: 100%;
    padding: 11px 14px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    outline: none;
    transition: all 0.2s;
  }

  .lx-input:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88,166,255,0.12);
  }

  .lx-input::placeholder { color: #484f58; }

  .lx-error {
    background: rgba(248,81,73,0.1);
    border: 1px solid rgba(248,81,73,0.3);
    border-radius: 6px;
    padding: 10px 14px;
    font-size: 0.78rem;
    color: #f85149;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .lx-btn {
    width: 100%;
    padding: 12px;
    margin-top: 4px;
    background: linear-gradient(135deg, #238636, #2ea043);
    color: #fff;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    font-weight: bold;
    letter-spacing: 2px;
    transition: all 0.2s;
    position: relative;
    overflow: hidden;
  }

  .lx-btn:hover {
    background: linear-gradient(135deg, #2ea043, #3fb950);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(46,160,67,0.4);
  }

  .lx-btn:active { transform: translateY(0); }

  .lx-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .lx-divider {
    border: none;
    border-top: 1px solid #21262d;
    margin: 24px 0 16px;
  }

  .lx-forgot {
    text-align: center;
    font-size: 0.75rem;
    color: #58a6ff;
    cursor: pointer;
    transition: color 0.2s;
    letter-spacing: 0.5px;
  }

  .lx-forgot:hover { color: #79c0ff; text-decoration: underline; }

  .lx-cursor {
    display: inline-block;
    animation: blink 1s step-end infinite;
    color: #58a6ff;
    margin-left: 2px;
  }
`;

export default function Login({ navigate }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState("");

  const tagline = "Acceso al sistema";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTyped(tagline.slice(0, i + 1));
      i++;
      if (i >= tagline.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      if (username === "admin" && password === "1234") {
        navigate(ROUTES.DASHBOARD);
      } else {
        setError("Usuario o contraseña incorrectos");
        setLoading(false);
      }
    }, 800);
  };

  return (
    <>
      <style>{styles}</style>
      <div className="lx-bg">
        <div className="lx-scanline" />
        <div className="lx-glow" />

        <div className="lx-wrap">

          {/* Panel izquierdo */}
          <div className="lx-left">
            <div className="lx-brand">
              <div className="lx-logo">IDSS</div>
              <div className="lx-logoname">Intelligent Driving Support System</div>
              <span className="lx-version">v0.1 · PROTOTIPO</span>
            </div>

            <ul className="lx-features">
              <li>Detección de objetos en tiempo real</li>
              <li>Simulación vehicular avanzada</li>
              <li>Modo experimental peatón y bicicleta</li>
              <li>Alertas inteligentes de conducción</li>
              <li>Panel de análisis integrado</li>
            </ul>

            <div className="lx-status-row">
              <span className="lx-dot" />
              Sistema activo · 11/4/2026
            </div>
          </div>

          {/* Panel derecho */}
          <div className="lx-right">
            <div className="lx-form-title">
              {typed}<span className="lx-cursor">|</span>
            </div>
            <div className="lx-form-sub">Ingresa tus credenciales para continuar</div>

            {error && (
              <div className="lx-error">
                ✕ {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="lx-input-wrap">
                <label className="lx-label">Usuario</label>
                <input
                  className="lx-input"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(""); }}
                  autoFocus
                />
              </div>

              <div className="lx-input-wrap">
                <label className="lx-label">Contraseña</label>
                <input
                  className="lx-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                />
              </div>

              <button className="lx-btn" type="submit" disabled={loading}>
                {loading ? "VERIFICANDO..." : "▶ INICIAR SESIÓN"}
              </button>
            </form>

            <hr className="lx-divider" />
            <div className="lx-forgot">¿Olvidaste tu contraseña?</div>
          </div>

        </div>
      </div>
    </>
  );
}