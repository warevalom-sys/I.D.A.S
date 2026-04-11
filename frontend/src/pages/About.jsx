import { ROUTES } from "../Routes";

export default function About({ navigate }) {
  return (
    <div className="about-page">
      <div className="about-header">
        <h1 className="page-title">Acerca del proyecto</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>← Inicio</button>
      </div>

      <div className="about-card">
        <div className="about-logo-block">
          <span className="about-logo-icon">⬡</span>
          <div>
            <div className="about-system-name">IDSS</div>
            <div className="about-system-full">Intelligent Driving Support System</div>
            <div className="about-system-sub">Sistema de soporte inteligente para la conducción</div>
          </div>
        </div>

        <div className="about-divider" />

        <div className="about-section">
          <div className="about-section-title">Descripción</div>
          <p>Prototipo académico desarrollado como proyecto universitario de Ingeniería de Sistemas. El sistema analiza video proveniente de una cámara o archivos de video, detecta objetos relevantes (vehículos, peatones, obstáculos) y genera alertas de riesgo de colisión basadas en proximidad.</p>
        </div>

        <div className="about-section">
          <div className="about-section-title">Flujo del sistema</div>
          <div className="about-flow">
            {["Captura de video", "Procesamiento CV", "Detección de objetos", "Estimación de proximidad", "Análisis de riesgo", "Alerta visual / sonora"].map((step, i, arr) => (
              <div key={step} className="flow-step-wrap">
                <div className="flow-step">{step}</div>
                {i < arr.length - 1 && <div className="flow-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-title">Alcance del prototipo (este semestre)</div>
          <div className="about-scope">
            {[
              "Detección de objetos en video",
              "Estimación aproximada de proximidad",
              "Generación de alertas de riesgo",
              "Funcionamiento con videos de simulación",
              "Modo experimental (peatón y bicicleta)",
              "Interfaz gráfica funcional",
            ].map((item) => (
              <div key={item} className="scope-item">
                <span className="scope-check">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-title">Tecnologías</div>
          <div className="about-tags">
            {["React", "Vite", "Python", "OpenCV", "YOLO", "Visión computacional"].map((t) => (
              <span key={t} className="tech-tag">{t}</span>
            ))}
          </div>
        </div>

        <div className="about-disclaimer">
          ⚠ Este sistema NO controla ningún vehículo ni toma decisiones de conducción. Es exclusivamente un sistema de asistencia visual. La responsabilidad de conducción recae siempre en el conductor.
        </div>
      </div>
    </div>
  );
}