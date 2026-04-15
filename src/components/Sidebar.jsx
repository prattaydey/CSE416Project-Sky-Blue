import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchDraftById, fetchUserDrafts, selectUserDraft } from "../services/api";
import "./Sidebar.css";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const [drafts, setDrafts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [teamsError, setTeamsError] = useState("");
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [draftsError, setDraftsError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    async function loadDrafts() {
      if (!user?.username) {
        setDrafts([]);
        setDraftsError("");
        setLoadingDrafts(false);
        return;
      }

      setLoadingDrafts(true);
      setDraftsError("");

      try {
        const data = await fetchUserDrafts(user.username);
        if (!cancelled) {
          setDrafts(Array.isArray(data?.drafts) ? data.drafts : []);
          if (data?.activeDraft && user?.activeDraft !== data.activeDraft) {
            updateUser({ activeDraft: data.activeDraft });
          }
        }
      } catch (err) {
        if (!cancelled) {
          setDrafts([]);
          setDraftsError("Unable to load your drafts.");
        }
      } finally {
        if (!cancelled) {
          setLoadingDrafts(false);
        }
      }
    }

    loadDrafts();

    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  useEffect(() => {
    let cancelled = false;
    //AI generated - Load teams for user's selected draft if available
    async function loadTeams() {
      if (!user?.activeDraft) {
        setTeams([]);
        setTeamsError("");
        setLoadingTeams(false);
        return;
      }

      setLoadingTeams(true);
      setTeamsError("");

      try {
        const data = await fetchDraftById(user.activeDraft);
        if (!cancelled) {
          setTeams(Array.isArray(data?.teams) ? data.teams : []);
        }
      } catch (err) {
        if (!cancelled) {
          setTeams([]);
          setTeamsError("Unable to load teams for your draft.");
        }
      } finally {
        if (!cancelled) {
          setLoadingTeams(false);
        }
      }
    }

    loadTeams();

    return () => {
      cancelled = true;
    };
  }, [user?.activeDraft, location.pathname]);

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
        <NavLink to="/app" className="nav-item" end>
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
          Drafts
        </h3>
        {loadingDrafts ? (
          <span className="nav-item sub-item">Loading drafts...</span>
        ) : draftsError ? (
          <span className="nav-item sub-item">{draftsError}</span>
        ) : drafts.length > 0 ? (
          <label className="draft-select-label">
            <span className="draft-select-text">Selected Draft</span>
            <select
              value={user?.activeDraft || ""}
              onChange={async (e) => {
                const selectedDraft = e.target.value;
                if (!selectedDraft) {
                  return;
                }

                try {
                  await selectUserDraft(user.username, selectedDraft);
                  updateUser({ activeDraft: selectedDraft });
                } catch (err) {
                  setDraftsError("Unable to select that draft.");
                }
              }}
              className="draft-select"
            >
              <option value="" disabled>
                Pick a draft
              </option>
              {drafts.map((draft, index) => (
                <option key={draft._id || index} value={draft._id}>
                  {`Draft ${index + 1} — ${draft.type} • ${draft.numberOfTeams} teams`}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <span className="nav-item sub-item">No saved drafts yet.</span>
        )}
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-section-title">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 1a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM3 13c0-2.21 2.24-4 5-4s5 1.79 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Teams
        </h3>
        {loadingTeams ? (
          <span className="nav-item sub-item">Loading teams...</span>
        ) : teamsError ? (
          <span className="nav-item sub-item">{teamsError}</span>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <NavLink
              key={team._id || team.name}
              to={`/team/${team._id}`}
              className="nav-item sub-item"
            >
              {team.name}
            </NavLink>
          ))
        ) : (
          <span className="nav-item sub-item">
            {user?.activeDraft ? "No teams available for your draft." : "No draft selected yet."}
          </span>
        )}
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
