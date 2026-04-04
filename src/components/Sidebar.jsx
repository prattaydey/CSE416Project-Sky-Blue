import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./Sidebar.css";

const SAMPLE_TEAMS = ["Team 1", "Team 2", "Team 3", "Team 4", "Team 5", "Team 6"];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h1>Fantasy Baseball</h1>
        <span className="sidebar-subtitle">Draft Kit</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" className="nav-item" end>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Available Players
        </NavLink>
        <NavLink to="/draft-setup" className="nav-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Draft Setup
        </NavLink>
      </nav>

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM3 13c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Teams
        </h3>
        {SAMPLE_TEAMS.map((team) => (
          <span key={team} className="nav-item sub-item">{team}</span>
        ))}
      </div>

      <div className="sidebar-bottom">
        <NavLink to="/api-info" className="nav-item">API Info</NavLink>
        <div className="sidebar-user">
          <div className="avatar">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM3 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </div>
          <span>{user?.username || "Guest"}</span>
        </div>
        <button onClick={handleLogout} className="nav-item logout-btn">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2H13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10M6 12l4-4m0 0l-4-4m4 4H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Logout
        </button>
      </div>
    </aside>
  );
}
