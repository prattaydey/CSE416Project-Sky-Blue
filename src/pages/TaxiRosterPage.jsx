//Ai generated
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDraftById } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import "./TaxiRosterPage.css";

export default function TaxiRosterPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [draft, setDraft] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [draftId, setDraftId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDraft() {
      setLoading(true);
      setError(null);

      if (!user?.activeDraft) {
        if (!cancelled) {
          setError("No active draft found. Please select a draft first.");
          setLoading(false);
        }
        return;
      }

      try {
        const data = await fetchDraftById(user.activeDraft);
        if (!cancelled) {
          setDraftId(user.activeDraft);
          setDraft(data.draft || null);
          setTeams(Array.isArray(data.teams) ? data.teams : []);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to load draft: ${err.message}`);
          setLoading(false);
        }
      }
    }

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [user?.activeDraft]);

  // Filter taxi players based on search term
  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) {
      return teams;
    }

    const term = searchTerm.toLowerCase();
    return teams.map((team) => {
      const taxiPlayers = team.roster
        .filter((p) => p.position.toUpperCase() === "TAXI")
        .filter((p) =>
          p.playerName.toLowerCase().includes(term) ||
          p.playerId.toLowerCase().includes(term)
        );
      return { ...team, filteredTaxi: taxiPlayers };
    }).filter((team) => team.filteredTaxi.length > 0 || !searchTerm.trim());
  }, [teams, searchTerm]);

  if (loading) {
    return (
      <div className="taxi-roster-loading">
        <div className="spinner" />
        <p>Loading taxi rosters...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="taxi-roster-error">
        <div className="error-icon">!</div>
        <h3>Error</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={() => navigate("/app")}>
          Back to App
        </button>
      </div>
    );
  }

  if (!draft || !teams.length) {
    return (
      <div className="taxi-roster-empty">
        <div className="empty-icon"></div>
        <h3>No Draft Found</h3>
        <p>Please select a draft first.</p>
        <button className="retry-btn" onClick={() => navigate("/app")}>
          Back to App
        </button>
      </div>
    );
  }

  const hasTaxiSquad = teams.some((t) => t.roster.some((p) => p.position.toUpperCase() === "TAXI"));

  if (!hasTaxiSquad) {
    return (
      <div className="taxi-roster-empty">
        <div className="empty-icon"></div>
        <h3>No Taxi Squad Players Yet</h3>
        <p>This draft doesn't have a taxi squad or no players have been added to it yet.</p>
        <button className="retry-btn" onClick={() => navigate("/app")}>
          Back to App
        </button>
      </div>
    );
  }

  return (
    <div className="taxi-roster-page">
      <div className="taxi-roster-header">
        <button type="button" className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <div>
          <h2>Taxi Squad Rosters</h2>
          <p>All taxi squad picks can be made in any order</p>
        </div>
      </div>

      <div className="taxi-roster-controls">
        <input
          type="text"
          className="taxi-search-input"
          placeholder="Search players by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="taxi-rosters-container">
        {teams.map((team) => {
          const taxiPlayers = team.roster.filter((p) => p.position.toUpperCase() === "TAXI");
          const displayPlayers = searchTerm.trim()
            ? taxiPlayers.filter((p) =>
              p.playerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.playerId.toLowerCase().includes(searchTerm.toLowerCase())
            )
            : taxiPlayers;

          if (displayPlayers.length === 0 && searchTerm.trim()) {
            return null;
          }

          return (
            <div key={team._id} className="taxi-team-card">
              <div className="taxi-team-header">
                <h3>{team.name}</h3>
                <div className="taxi-team-stats">
                  <span className="stat-item">
                    <strong>{displayPlayers.length}</strong> taxi players
                  </span>
                  <span className="stat-item">
                    <strong>${displayPlayers.length * 1}</strong> spent on taxi
                  </span>
                </div>
              </div>

              {displayPlayers.length > 0 ? (
                <div className="taxi-players-list">
                  {displayPlayers.map((player, index) => (
                    <div key={`${player.playerId}-${index}`} className="taxi-player-item">
                      <div className="taxi-player-name">{player.playerName}</div>
                      <div className="taxi-player-price">$1</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-taxi-players">
                  <p>No taxi squad players for this team</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="taxi-roster-info">
        <h4>About Taxi Squad</h4>
        <ul>
          <li>Players can be added to the taxi squad in <strong>any order</strong></li>
          <li>Taxi squad is filled <strong>after</strong> the main roster is complete</li>
          <li>Each taxi squad player costs exactly <strong>$1</strong></li>
          <li>Players can be easily searched and found above</li>
          <li>Players added to taxi squad are removed from the eligible players list</li>
        </ul>
      </div>
    </div>
  );
}
