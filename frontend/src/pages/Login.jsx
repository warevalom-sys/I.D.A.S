import { useState } from "react";
import { ROUTES } from "../Routes";

const USUARIOS_PREDEFINIDOS = [
  { usuario: "moto_user",  password: "1234", tipo: "Motocicleta" },
  { usuario: "carro_user", password: "1234", tipo: "Carro" },
  { usuario: "bici_user",  password: "1234", tipo: "Bicicleta" },
  { usuario: "peaton",     password: "1234", tipo: "A pie" },
];

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .login-container {
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #0d1117;
    font-family: 'Courier New', Courier, monospace;
  }

  .login-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 12px;
    padding: 48px 40px;
    width: 380px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .login-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .login-logo {
    font-size: 1.6rem;
    font-weight: bold;
    color: #58a6ff;
    letter-spacing: 2px;
  }

  .login-subtitle {
    font-size: 0.7rem;
    color: #8b949e;
    letter-spacing: 1px;
    margin-top: 4px;
    text-transform: uppercase;
  }

  .login-divider {
    border: none;
    border-top: 1px solid #30363d;
    margin: 16px 0 28px;
  }

  .login-label {
    display: block;
    font-size: 0.75rem;
    color: #8b949e;
    margin-bottom: 6px;
    letter-spacing: 1px;
    text-transform: uppercase;
  }

  .login-input-group {
    margin-bottom: 16px;
  }

  .login-input {
    width: 100%;
    padding: 10px 14px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .login-input:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
  }

  .login-input::placeholder { color: #484f58; }

  .login-select {
    width: 100%;
    padding: 10px 14px;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e6edf3;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    outline: none;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .login-select:focus {
    border-color: #58a6ff;
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.15);
  }

  .login-btn {
    width: 100%;
    padding: 11px;
    margin-top: 8px;
    background: #238636;
    color: #fff;
    border: 1px solid #2ea043;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    font-weight: bold;
    letter-spacing: 1px;
    transition: background 0.2s;
  }

  .login-btn:hover { background: #2ea043; }

  .login-btn-secondary {
    width: 100%;
    padding: 11px;
    margin-top: 8px;
    background: transparent;
    color: #58a6ff;
    border: 1px solid #58a6ff;
    border-radius: 6px;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.9rem;
    font-weight: bold;
    letter-spacing: 1px;
    transition: background 0.2s;
  }

  .login-btn-secondary:hover { background: rgba(88, 166, 255, 0.1); }

  .login-error {
    background: #3d1a1a;
    border: 1px solid #f85149;
    color: #f85149;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-bottom: 16px;
    text-align: center;
  }

  .login-success {
    background: #1a3d1a;
    border: 1px solid #3fb950;
    color: #3fb950;
    padding: 10px 14px;
    border-radius: 6px;
    font-size: 0.8rem;
    margin-bottom: 16px;
    text-align: center;
  }

  .login-status {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #30363d;
    font-size: 0.75rem;
    color: #8b949e;
    letter-spacing: 0.5px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3fb950;
    flex-shrink: 0;
    box-shadow: 0 0 6px #3fb950;
  }

  .login-tabs {
    display: flex;
    margin-bottom: 24px;
    border-bottom: 1px solid #30363d;
  }

  .login-tab {
    flex: 1;
    padding: 10px;
    background: transparent;
    border: none;
    color: #8b949e;
    cursor: pointer;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.85rem;
    letter-spacing: 1px;
    transition: color 0.2s;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
  }

  .login-tab.active {
    color: #58a6ff;
    border-bottom: 2px solid #58a6ff;
  }

  .usuarios-hint {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 16px;
    font-size: 0.75rem;
    color: #8b949e;
    line-height: 1.8;
  }

  .usuarios-hint span {
    color: #58a6ff;
  }
`;

export default function Login({ navigate }) {
  const [tab, setTab]           = useState("login"); // "login" | "registro"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [tipo,     setTipo]     = useState("Carro");
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  // Usuarios registrados en sesión (inician con los predefinidos)
  const [usuarios, setUsuarios] = useState(USUARIOS_PREDEFINIDOS);

  const handleLogin = (e) => {
    e.preventDefault();
    setError("");
    const encontrado = usuarios.find(
      (u) => u.usuario === username && u.password === password
    );
    if (encontrado) {
      navigate(ROUTES.DASHBOARD);
    } else {
      setError("Usuario o contraseña incorrectos.");
    }
  };

  const handleRegistro = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!username || !password || !confirm) {
      setError("Completa todos los campos.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 4) {
      setError("La contraseña debe tener al menos 4 caracteres.");
      return;
    }
    if (usuarios.find((u) => u.usuario === username)) {
      setError("El usuario ya existe.");
      return;
    }

    setUsuarios((prev) => [...prev, { usuario: username, password, tipo }]);
    setSuccess(`Usuario "${username}" creado. Ahora puedes iniciar sesión.`);
    setUsername("");
    setPassword("");
    setConfirm("");
    setTipo("Carro");
    setTab("login");
  };

  return (
    <>
      <style>{styles}</style>
      <div className="login-container">
        <div className="login-card">

          <div className="login-header">
            <div className="login-logo">IDSS</div>
            <div className="login-subtitle">Intelligent Driving Support System</div>
          </div>

          <hr className="login-divider" />

          {/* Tabs */}
          <div className="login-tabs">
            <button
              className={`login-tab ${tab === "login" ? "active" : ""}`}
              onClick={() => { setTab("login"); setError(""); setSuccess(""); }}
            >
              Iniciar sesión
            </button>
            <button
              className={`login-tab ${tab === "registro" ? "active" : ""}`}
              onClick={() => { setTab("registro"); setError(""); setSuccess(""); }}
            >
              Crear cuenta
            </button>
          </div>

          {error   && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <>
              <div className="usuarios-hint">
                Usuarios de prueba (contraseña: <span>1234</span>)<br />
                <span>moto_user</span> — Motocicleta<br />
                <span>carro_user</span> — Carro<br />
                <span>bici_user</span> — Bicicleta<br />
                <span>peaton</span> — A pie
              </div>

              <form onSubmit={handleLogin}>
                <div className="login-input-group">
                  <label className="login-label">Usuario</label>
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Ingresa tu usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
                <div className="login-input-group">
                  <label className="login-label">Contraseña</label>
                  <input
                    className="login-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button className="login-btn" type="submit">
                  ▶ Iniciar sesión
                </button>
              </form>
            </>
          )}

          {/* ── REGISTRO ── */}
          {tab === "registro" && (
            <form onSubmit={handleRegistro}>
              <div className="login-input-group">
                <label className="login-label">Usuario</label>
                <input
                  className="login-input"
                  type="text"
                  placeholder="Elige un nombre de usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="login-input-group">
                <label className="login-label">Contraseña</label>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="login-input-group">
                <label className="login-label">Confirmar contraseña</label>
                <input
                  className="login-input"
                  type="password"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>
              <div className="login-input-group">
                <label className="login-label">Tipo de vehículo</label>
                <select
                  className="login-select"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  <option>Carro</option>
                  <option>Motocicleta</option>
                  <option>Bicicleta</option>
                  <option>A pie</option>
                </select>
              </div>
              <button className="login-btn" type="submit">
                ✔ Crear cuenta
              </button>
            </form>
          )}

          <div className="login-status">
            <span className="status-dot" />
            Sistema activo · v0.1 · Prototipo universitario
          </div>

        </div>
      </div>
    </>
  );
}