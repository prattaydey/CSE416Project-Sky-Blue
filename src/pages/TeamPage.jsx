import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchTeamById, removeTeamPlayer } from "../services/api";
import "./TeamPage.css";

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export default function TeamPage() {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingPlayerId, setSavingPlayerId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTeam() {
      setLoading(true);
      setError("");

      try {
        const data = await fetchTeamById(teamId);
        if (!cancelled) {
          setTeam(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load team data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadTeam();
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  const roster = team?.roster || [];
  const draft = team?.draft;

  const spent = useMemo(
    () => roster.reduce((sum, item) => sum + (Number(item.amountPaid) || 0), 0),
    [roster]
  );

  const totalBudget = draft?.budgetPerTeam ?? spent + (team?.budgetRemaining ?? 0);
  const remainingBudget = team?.budgetRemaining ?? 0;
  const percentUsed = totalBudget ? Math.round((spent / totalBudget) * 100) : 0;

  const positionSlots = useMemo(() => {
    if (!draft?.rosterSlots) return [];
    return draft.rosterSlots.map((slot) => ({
      ...slot,
      filled: roster.filter((item) => item.position === slot.position).length,
    }));
  }, [draft, roster]);

  const stats = useMemo(() => {
    const playerCount = roster.length;
    const pitchers = roster.filter((item) => {
      const position = String(item.position || "").toUpperCase();
      return position.includes("P");
    }).length;
    const hitters = playerCount - pitchers;
    return {
      playerCount,
      avgPrice: playerCount ? (spent / playerCount).toFixed(1) : 0,
      hitters,
      pitchers,
    };
  }, [roster, spent]);

  const handleRemovePlayer = async (playerId) => {
    setError("");
    setSavingPlayerId(playerId);

    try {
      const updated = await removeTeamPlayer(teamId, playerId);
      setTeam(updated);
    } catch (err) {
      setError(err.message || "Unable to remove player.");
    } finally {
      setSavingPlayerId(null);
    }
  };

  if (loading) {
    return (
      <div className="team-page">
        <div className="team-loading">Loading team information…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-page">
        <div className="team-error">
          <button className="back-btn" onClick={() => navigate("/app", { replace: true })}>
            ← Back
          </button>
          <p>{error}</p>
        </div>
      </div>
    );
  }
// Ai generated 
  return (
    <div className="team-page">
      <div className="team-header">
        <button className="back-btn" onClick={() => navigate("/app", { replace: true })}>
          ← Back
        </button>
        <div>
          <h2>{team?.name || "Team"}</h2>
          <p className="team-subtitle">Viewing roster and draft slot status</p>
        </div>
      </div>

      <div className="team-summary-grid">
        <div className="team-summary-card">
          <div className="summary-row">
            <div>
              <p className="summary-label">Total Budget</p>
              <p className="summary-value">{formatCurrency(totalBudget)}</p>
            </div>
            <div>
              <p className="summary-label">Spent</p>
              <p className="summary-value spent">{formatCurrency(spent)}</p>
            </div>
            <div>
              <p className="summary-label">Remaining</p>
              <p className="summary-value remaining">{formatCurrency(remainingBudget)}</p>
            </div>
          </div>
          <div className="budget-bar-wrapper">
            <div className="budget-bar">
              <div className="budget-bar-fill" style={{ width: `${Math.min(percentUsed, 100)}%` }} />
            </div>
            <span className="budget-bar-label">Budget Used {percentUsed}%</span>
          </div>
        </div>
      </div>

      <div className="team-main-grid">
        <div className="team-roster-card">
          <div className="team-roster-header">
            <div>
              <h3>Current Roster ({stats.playerCount})</h3>
              <p>Shows drafted players, position, and the price paid.</p>
            </div>
          </div>
          {roster.length === 0 ? (
            <div className="empty-roster">This team has no drafted players yet.</div>
          ) : (
            <table className="team-roster-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Price</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {roster.map((player) => (
                  <tr key={player.playerId || `${player.playerName}-${player.position}-${player.amountPaid}`}>
                    <td>{player.playerName || "Unknown"}</td>
                    <td>{player.position || "--"}</td>
                    <td>{formatCurrency(player.amountPaid)}</td>
                    <td>
                      <button
                        className="remove-player-btn"
                        onClick={() => handleRemovePlayer(player.playerId)}
                        disabled={savingPlayerId === player.playerId}
                        aria-label={`Remove ${player.playerName}`}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="team-side-panel">
          <div className="team-card position-card">
            <h3>Position Breakdown</h3>
            {positionSlots.length === 0 ? (
              <p>No draft slot configuration available.</p>
            ) : (
              <ul>
                {positionSlots.map((slot) => (
                  <li key={slot.position}>
                    <span>{slot.position}</span>
                    <span>{slot.filled}/{slot.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="team-card quick-stats-card">
            <h3>Quick Stats</h3>
            <div className="stat-row">
              <span>Avg Price/Player</span>
              <strong>{formatCurrency(stats.avgPrice)}</strong>
            </div>
            <div className="stat-row">
              <span>Hitters</span>
              <strong>{stats.hitters}</strong>
            </div>
            <div className="stat-row">
              <span>Pitchers</span>
              <strong>{stats.pitchers}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
