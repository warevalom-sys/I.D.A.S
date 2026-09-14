import { ROUTES } from "../Routes";

export default function About({ navigate, t = (key) => key }) {
  const flowSteps = [1, 2, 3, 4, 5, 6].map((n) => t(`about.flow.step${n}`));
  const scopeItems = [1, 2, 3, 4, 5, 6].map((n) => t(`about.scope.item${n}`));
  const techTags = ["React", "Vite", "Python", "OpenCV", "YOLO", t("about.tech.covision")];

  return (
    <div className="about-page">
      <div className="about-header">
        <h1 className="page-title">{t("sidebar.menu.about")}</h1>
        <button className="back-btn" onClick={() => navigate(ROUTES.DASHBOARD)}>{t("settings.back")}</button>
      </div>

      <div className="about-card">
        <div className="about-logo-block">
          <span className="about-logo-icon">⬡</span>
          <div>
            <div className="about-system-name">I.D.A.S</div>
            <div className="about-system-full">Intelligent Driving Support System</div>
            <div className="about-system-sub">{t("sidebar.logoSub")}</div>
          </div>
        </div>

        <div className="about-divider" />

        <div className="about-section">
          <div className="about-section-title">{t("about.description.title")}</div>
          <p>{t("about.description.text")}</p>
        </div>

        <div className="about-section">
          <div className="about-section-title">{t("about.flow.title")}</div>
          <div className="about-flow">
            {flowSteps.map((step, i, arr) => (
              <div key={step} className="flow-step-wrap">
                <div className="flow-step">{step}</div>
                {i < arr.length - 1 && <div className="flow-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-title">{t("about.scope.title")}</div>
          <div className="about-scope">
            {scopeItems.map((item) => (
              <div key={item} className="scope-item">
                <span className="scope-check">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="about-section">
          <div className="about-section-title">{t("about.tech.title")}</div>
          <div className="about-tags">
            {techTags.map((tag) => (
              <span key={tag} className="tech-tag">{tag}</span>
            ))}
          </div>
        </div>

        <div className="about-disclaimer">
          {t("about.disclaimer")}
        </div>
      </div>
    </div>
  );
}