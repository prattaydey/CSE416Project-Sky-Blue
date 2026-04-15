import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./WelcomePage.css";

const FEATURES = [
  {
    title: "Player Database",
    description: "Access comprehensive stats for thousands of players with advanced filtering and search capabilities.",
  },
  {
    title: "Team Management",
    description: "Track budgets, manage rosters, and optimize your draft strategy across multiple teams.",
  },
  {
    title: "Draft Analytics",
    description: "Make data-driven decisions with real-time analytics and player comparisons.",
  },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/app" replace />;
  }

  return (
    <div className="welcome-page">
      <header className="welcome-header">
        <div className="welcome-brand">Fantasy Baseball</div>
        <div className="welcome-actions">
          <button type="button" className="welcome-btn ghost" onClick={() => navigate("/login")}>
            Login
          </button>
          <button type="button" className="welcome-btn primary" onClick={() => navigate("/register")}>
            Get Started
          </button>
        </div>
      </header>

      <main className="welcome-main">
        <section className="hero">
          <h1>Your Ultimate Fantasy Baseball Draft Management Tool</h1>
          <p>
            Track players, manage team budgets, and dominate your draft with advanced analytics and real-time updates.
          </p>
          <div className="hero-actions">
            <button type="button" className="welcome-btn primary" onClick={() => navigate("/register")}>
              Create Free Account
            </button>
            <button type="button" className="welcome-btn ghost" onClick={() => navigate("/login")}>
              Sign In
            </button>
          </div>
        </section>

        <section className="feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="api-card">
          <h2>Developer API Available</h2>
          <p>Integrate our Fantasy Baseball data into your applications with our comprehensive API.</p>
          <button type="button" className="welcome-btn primary" onClick={() => navigate("/register")}>
            View API Documentation
          </button>
        </section>
      </main>
    </div>
  );
}
