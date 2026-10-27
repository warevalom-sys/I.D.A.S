import { useState, useEffect } from "react";
import { ROUTES } from "../Routes";
import { login as apiLogin, registrarUsuario } from "../services/api";

// Tipo de vehículo → modo_preferido + tiene_auto.
// Bicicleta no cuenta como "auto"; Carro y Motocicleta sí.
const TIPOS_VEHICULO = [
  { value: "Bicicleta",   modoPreferido: "ciclista", tieneAuto: false },
  { value: "Carro",       modoPreferido: "carro",    tieneAuto: true  },
  { value: "Motocicleta", modoPreferido: "carro",    tieneAuto: true  },
];

// Usa las variables del tema de App.css (--bg-*, --text-*, --border, etc.),
// así el login respeta modo claro/oscuro igual que el resto de la app.
const styles = `
  @keyframes lgFadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes lgPulseRing {
    0%   { transform: scale(0.8); opacity: 1; }
    100% { transform: scale(2);   opacity: 0; }
  }
  @keyframes lgBlink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  @keyframes lgFloat {
    0%, 100% { transform: translateY(0); }
    50%      { transform: translateY(-6px); }
  }

  .lg-page {
    position: relative;
    overflow: hidden;
    min-height: 100vh;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(280px, 34%) 1fr;
    background: var(--bg-base, #16181c);
    color: var(--text-primary, #eef0f2);
    font-family: var(--font-ui, 'Nunito Sans', sans-serif);
  }

  .lg-glow {
    position: absolute;
    width: 560px; height: 560px;
    border-radius: 50%;
    top: 50%; left: 66%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, color-mix(in srgb, var(--text-accent, #00e5b8) 12%, transparent) 0%, transparent 70%);
    pointer-events: none;
  }

  /* ── Panel izquierdo (marca) ── */
  .lg-side {
    position: relative;
    z-index: 1;
    overflow: hidden;
    background: linear-gradient(160deg, #0e2621 0%, #0f1419 100%);
    border-right: 1px solid #1b232b;
    padding: 48px 40px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .lg-side::after {
    content: '';
    position: absolute;
    top: -60px; right: -60px;
    width: 180px; height: 180px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .lg-brand { animation: lgFloat 4s ease-in-out infinite; }
  .lg-logo {
    font-family: var(--font-display, 'Quicksand', sans-serif);
    font-size: 2.6rem;
    font-weight: 800;
    letter-spacing: 3px;
    line-height: 1;
    background: linear-gradient(135deg, #14b8a6, #22d3ee);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .lg-brand-full {
    margin-top: 8px;
    font-size: 0.68rem;
    letter-spacing: 1px;
    color: #8b98a1;
  }
  .lg-version {
    display: inline-block;
    margin-top: 12px;
    padding: 3px 10px;
    border-radius: 20px;
    border: 1px solid rgba(45,212,191,0.35);
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #2dd4bf;
  }
  .lg-side-text {
    font-size: 1rem;
    line-height: 1.55;
    color: #9aa5ad;
    max-width: 30ch;
  }
  .lg-side-foot {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.75rem;
    color: #9aa5ad;
  }
  .lg-dot {
    position: relative;
    width: 8px; height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    background: #2dd4bf;
    box-shadow: 0 0 7px rgba(45,212,191,0.8);
  }
  .lg-dot::after {
    content: '';
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 1px solid #2dd4bf;
    animation: lgPulseRing 2s ease-out infinite;
  }

  /* ── Panel derecho (formulario) ── */
  .lg-main {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
  }
  .lg-form-col {
    width: 100%;
    max-width: 400px;
    animation: lgFadeInUp 0.5s ease both;
  }
  .lg-cursor {
    display: inline-block;
    margin-left: 1px;
    color: var(--text-accent, #00e5b8);
    animation: lgBlink 1s step-end infinite;
  }
  .lg-title {
    font-family: var(--font-display, 'Quicksand', sans-serif);
    font-size: 1.6rem;
    font-weight: 700;
    margin: 0 0 6px;
  }
  .lg-sub {
    font-size: 0.9rem;
    color: var(--text-secondary, #8b929b);
    margin: 0 0 24px;
  }

  /* Toggle tipo píldora (Iniciar sesión / Crear cuenta) */
  .lg-toggle {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px;
    margin-bottom: 24px;
    border-radius: 999px;
    background: var(--bg-card, #23262b);
    border: 1px solid var(--border-bright, #3a3f47);
  }
  .lg-toggle button {
    padding: 10px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary, #8b929b);
    font: inherit;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease;
  }
  .lg-toggle button:hover { color: var(--text-primary, #eef0f2); }
  .lg-toggle button[aria-selected="true"] {
    background: var(--text-accent, #00e5b8);
    color: var(--text-accent-ink, #04302a);
  }

  /* Campos */
  .lg-field { margin-bottom: 18px; }
  .lg-label {
    display: block;
    margin-bottom: 6px;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text-primary, #eef0f2);
  }
  .lg-input-wrap { position: relative; }
  .lg-input {
    width: 100%;
    height: 46px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1px solid var(--border-bright, #3a3f47);
    background: var(--bg-card, #23262b);
    color: var(--text-primary, #eef0f2);
    font: inherit;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }
  .lg-input::placeholder { color: var(--text-muted, #5b616a); }
  .lg-input:focus {
    border-color: var(--text-accent, #00e5b8);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--text-accent, #00e5b8) 22%, transparent);
  }
  .lg-input.has-action { padding-right: 70px; }
  .lg-show {
    position: absolute;
    right: 6px; top: 50%;
    transform: translateY(-50%);
    padding: 6px 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--text-secondary, #8b929b);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }
  .lg-show:hover { color: var(--text-accent, #00e5b8); }

  /* Tipo de vehículo: 3 opciones visibles, sin desplegable */
  .lg-choices {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .lg-choice {
    padding: 11px 6px;
    border-radius: 14px;
    border: 1px solid var(--border-bright, #3a3f47);
    background: var(--bg-card, #23262b);
    color: var(--text-secondary, #8b929b);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 180ms ease;
  }
  .lg-choice:hover { border-color: var(--text-accent, #00e5b8); }
  .lg-choice[aria-checked="true"] {
    border-color: var(--text-accent, #00e5b8);
    background: var(--bg-active, #0c2420);
    color: var(--text-accent, #00e5b8);
  }

  /* Botón principal */
  .lg-submit {
    min-width: 180px;
    height: 46px;
    padding: 0 28px;
    margin-top: 6px;
    border: none;
    border-radius: 999px;
    background: var(--text-accent, #00e5b8);
    color: var(--text-accent-ink, #04302a);
    font: inherit;
    font-size: 0.95rem;
    font-weight: 800;
    cursor: pointer;
    transition: filter 180ms ease, transform 180ms ease;
  }
  .lg-submit:hover:not(:disabled) { filter: brightness(1.08); }
  .lg-submit:active:not(:disabled) { transform: scale(0.98); }
  .lg-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .lg-msg {
    padding: 10px 14px;
    border-radius: 12px;
    margin-bottom: 18px;
    font-size: 0.85rem;
  }
  .lg-msg.error {
    background: var(--red-dim, #4a1111);
    color: var(--red, #ff4d4f);
    border: 1px solid var(--red, #ff4d4f);
  }
  .lg-msg.ok {
    background: var(--green-dim, #173404);
    color: var(--green, #3ecf6e);
    border: 1px solid var(--green, #3ecf6e);
  }

  .lg-page button:focus-visible,
  .lg-page input:focus-visible {
    outline: 2px solid var(--text-accent, #00e5b8);
    outline-offset: 2px;
  }

  /* Móvil: el panel izquierdo pasa a ser una cabecera compacta */
  @media (max-width: 760px) {
    .lg-page { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
    .lg-side {
      flex-direction: row;
      align-items: center;
      justify-content: flex-start;
      gap: 14px;
      padding: 18px 20px;
      border-right: none;
      border-bottom: 1px solid var(--border-bright, #3a3f47);
    }
    .lg-logo { font-size: 1.8rem; }
    .lg-brand-full { margin-top: 2px; }
    .lg-version { display: none; }
    .lg-side-text, .lg-side-foot { display: none; }
    .lg-main { align-items: flex-start; padding-top: 28px; }
    .lg-submit { width: 100%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .lg-page *, .lg-page *::after { animation: none !important; transition: none !important; }
  }
`;

export default function Login({ navigate, onLoginSuccess }) {
  const [tab, setTab] = useState("login");

  // Login
  const [lUser, setLUser] = useState("");
  const [lPass, setLPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Registro
  const [rNombre, setRNombre] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rConf, setRConf] = useState("");
  const [rTipo, setRTipo] = useState("Carro");
  const [registrando, setRegistrando] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Título con efecto de escritura (se reescribe al cambiar de pestaña)
  const titulo = tab === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta";
  const [typed, setTyped] = useState("");
  useEffect(() => {
    let i = 0;
    setTyped("");
    const iv = setInterval(() => {
      i++;
      setTyped(titulo.slice(0, i));
      if (i >= titulo.length) clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, [titulo]);

  const clearMsgs = () => { setError(""); setSuccess(""); };
  const switchTab = (t) => { setTab(t); setShowPass(false); clearMsgs(); };

  const guardarSesionUsuario = (datosUsuario) => {
    localStorage.setItem("idas_usuario", JSON.stringify(datosUsuario));
    onLoginSuccess?.(datosUsuario);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!lUser.trim() || !lPass) { setError("Escribe tu usuario o email y tu contraseña."); return; }

    setLoading(true);
    try {
      const datos = await apiLogin(lUser.trim(), lPass);
      guardarSesionUsuario(datos);
      navigate(ROUTES.DASHBOARD);
    } catch {
      setError("Usuario/email o contraseña incorrectos. Revisa los datos e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    clearMsgs();
    if (!rNombre.trim() || !rEmail.trim() || !rPass || !rConf) { setError("Completa todos los campos."); return; }
    if (rPass !== rConf) { setError("Las contraseñas no coinciden."); return; }
    if (rPass.length < 4) { setError("La contraseña debe tener al menos 4 caracteres."); return; }

    const tipoInfo = TIPOS_VEHICULO.find((t) => t.value === rTipo);

    setRegistrando(true);
    try {
      await registrarUsuario({
        nombre: rNombre.trim(),
        email: rEmail.trim(),
        password: rPass,
        modo_preferido: tipoInfo.modoPreferido,
        tiene_auto: tipoInfo.tieneAuto,
        vehiculo: tipoInfo.tieneAuto ? { tipo: rTipo.toLowerCase() } : undefined,
      });
      setSuccess(`Cuenta creada para "${rNombre.trim()}". Ya puedes iniciar sesión.`);
      setRNombre(""); setREmail(""); setRPass(""); setRConf(""); setRTipo("Carro");
      setTimeout(() => switchTab("login"), 1200);
    } catch (err) {
      setError(err.message || "No se pudo crear la cuenta. Intenta de nuevo.");
    } finally {
      setRegistrando(false);
    }
  };

  const passwordField = (id, label, value, onChange, { withToggle = false, autoComplete } = {}) => (
    <div className="lg-field">
      <label className="lg-label" htmlFor={id}>{label}</label>
      <div className="lg-input-wrap">
        <input
          id={id}
          className={`lg-input${withToggle ? " has-action" : ""}`}
          type={withToggle && showPass ? "text" : "password"}
          placeholder="••••••••"
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => { onChange(e.target.value); clearMsgs(); }}
        />
        {withToggle && (
          <button
            type="button"
            className="lg-show"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPass ? "Ocultar" : "Ver"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="lg-page">
        <div className="lg-glow" />

        {/* ── Panel izquierdo ── */}
        <aside className="lg-side">
          <div className="lg-brand">
            <div className="lg-logo">IDAS</div>
            <div className="lg-brand-full">Intelligent Driving Support System</div>
            <span className="lg-version">v0.1 · PROTOTIPO</span>
          </div>
          <p className="lg-side-text">
            Detecta vehículos, peatones y ciclistas a tu alrededor y te avisa a tiempo.
          </p>
          <div className="lg-side-foot"><span className="lg-dot" />Sistema activo · Prototipo v0.1</div>
        </aside>

        {/* ── Panel derecho ── */}
        <main className="lg-main">
          <div className="lg-form-col">
            <h1 className="lg-title" aria-label={titulo}>
              {typed}<span className="lg-cursor" aria-hidden="true">|</span>
            </h1>
            <p className="lg-sub">
              {tab === "login"
                ? "Inicia sesión para continuar."
                : "Solo te toma un minuto."}
            </p>

            <div className="lg-toggle" role="tablist" aria-label="Acceso">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "login"}
                onClick={() => switchTab("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "registro"}
                onClick={() => switchTab("registro")}
              >
                Crear cuenta
              </button>
            </div>

            {error && <div className="lg-msg error" role="alert">{error}</div>}
            {success && <div className="lg-msg ok" role="status">{success}</div>}

            {tab === "login" && (
              <form onSubmit={handleLogin} noValidate>
                <div className="lg-field">
                  <label className="lg-label" htmlFor="lg-user">Usuario / email</label>
                  <input
                    id="lg-user"
                    className="lg-input"
                    type="text"
                    placeholder="tu@email.com"
                    autoComplete="username"
                    value={lUser}
                    onChange={(e) => { setLUser(e.target.value); clearMsgs(); }}
                    autoFocus
                  />
                </div>
                {passwordField("lg-pass", "Contraseña", lPass, setLPass, {
                  withToggle: true,
                  autoComplete: "current-password",
                })}
                <button className="lg-submit" type="submit" disabled={loading}>
                  {loading ? "Verificando…" : "Iniciar sesión"}
                </button>
              </form>
            )}

            {tab === "registro" && (
              <form onSubmit={handleRegistro} noValidate>
                <div className="lg-field">
                  <label className="lg-label" htmlFor="lg-nombre">Nombre</label>
                  <input
                    id="lg-nombre"
                    className="lg-input"
                    type="text"
                    placeholder="Tu nombre"
                    autoComplete="name"
                    value={rNombre}
                    onChange={(e) => { setRNombre(e.target.value); clearMsgs(); }}
                  />
                </div>
                <div className="lg-field">
                  <label className="lg-label" htmlFor="lg-email">Email</label>
                  <input
                    id="lg-email"
                    className="lg-input"
                    type="email"
                    placeholder="tu@email.com"
                    autoComplete="email"
                    value={rEmail}
                    onChange={(e) => { setREmail(e.target.value); clearMsgs(); }}
                  />
                </div>
                {passwordField("lg-rpass", "Contraseña", rPass, setRPass, {
                  withToggle: true,
                  autoComplete: "new-password",
                })}
                {passwordField("lg-rconf", "Confirmar contraseña", rConf, setRConf, {
                  autoComplete: "new-password",
                })}
                <div className="lg-field">
                  <span className="lg-label" id="lg-tipo-label">¿Cómo te mueves?</span>
                  <div className="lg-choices" role="radiogroup" aria-labelledby="lg-tipo-label">
                    {TIPOS_VEHICULO.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        role="radio"
                        aria-checked={rTipo === t.value}
                        className="lg-choice"
                        onClick={() => setRTipo(t.value)}
                      >
                        {t.value}
                      </button>
                    ))}
                  </div>
                </div>
                <button className="lg-submit" type="submit" disabled={registrando}>
                  {registrando ? "Creando…" : "Crear cuenta"}
                </button>
              </form>
            )}
          </div>
        </main>

      </div>
    </>
  );
}