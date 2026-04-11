//Ai generated frontend/src/pages/DraftSetupPage.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { createDraft } from "../services/api";
import "./DraftSetupPage.css";

const DEFAULT_POSITIONS = ["C", "1B", "2B", "3B", "SS", "OF", "DH", "P"];

const defaultRosterCounts = DEFAULT_POSITIONS.reduce((acc, pos) => {
  acc[pos] = 0;
  return acc;
}, {});

export default function DraftSetupPage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [type, setType] = useState("Both");
  const [numberOfTeams, setNumberOfTeams] = useState(6);
  const [budgetPerTeam, setBudgetPerTeam] = useState(260);
  const [rosterCounts, setRosterCounts] = useState(defaultRosterCounts);
  const [teamNames, setTeamNames] = useState(Array.from({ length: 6 }, () => ""));
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rosterSize = useMemo(
    () => DEFAULT_POSITIONS.reduce((sum, pos) => sum + Number(rosterCounts[pos] || 0), 0),
    [rosterCounts]
  );

  const handleTeamCountChange = (value) => {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 1) {
      return;
    }

    setNumberOfTeams(count);
    setTeamNames((previous) => {
      const next = Array.from({ length: count }, (_, index) => previous[index] || "");
      return next;
    });
  };

  const handleRosterCountChange = (position, value) => {
    const count = Number(value);
    if (!Number.isInteger(count) || count < 0) {
      return;
    }

    setRosterCounts((previous) => ({ ...previous, [position]: count }));
  };

  const handleTeamNameChange = (index, value) => {
    setTeamNames((previous) => {
      const next = [...previous];
      next[index] = value;
      return next;
    });
  };

  const handleReset = () => {
    setType("Both");
    setNumberOfTeams(6);
    setBudgetPerTeam(260);
    setRosterCounts(defaultRosterCounts);
    setTeamNames(Array.from({ length: 6 }, () => ""));
    setMessage("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!user?.username) {
      setError("You must be signed in to save settings.");
      return;
    }

    const rosterSlots = DEFAULT_POSITIONS.map((position) => ({
      position,
      count: Number(rosterCounts[position] || 0),
    }));

    const invalidSlot = rosterSlots.some((slot) => !Number.isInteger(slot.count) || slot.count < 0);
    if (invalidSlot) {
      setError("Roster position counts must be whole numbers.");
      return;
    }

    if (!Number.isInteger(numberOfTeams) || numberOfTeams < 1) {
      setError("Number of teams must be an integer greater than 0.");
      return;
    }

    if (typeof budgetPerTeam !== "number" || budgetPerTeam < 0) {
      setError("Budget per team must be a non-negative number.");
      return;
    }

    setSubmitting(true);

    try {
      const data = await createDraft({
        type,
        numberOfTeams,
        budgetPerTeam,
        rosterSlots,
        teamNames,
      });

      if (data?.draft?._id) {
        updateUser({ draft: data.draft._id });
      }

      navigate("/");
    } catch (err) {
      setError(err.message || "Unable to save draft settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="draft-setup-page">
      <div className="draft-setup-header">
        <button type="button" className="back-button" onClick={() => window.history.back()}>
          ← Back
        </button>
        <div>
          <h2>Draft Setup</h2>
          <p>Configure the rules and structure of your fantasy baseball draft.</p>
        </div>
      </div>

      <form className="draft-setup-form" onSubmit={handleSubmit}>
        <section className="draft-settings-card">
          <h3>League Settings</h3>
          <div className="draft-settings-grid">
            <label>
              League Type
              <select value={type} onChange={(e) => setType(e.target.value)}>
                <option value="AL">American League</option>
                <option value="NL">National League</option>
                <option value="Both">All of MLB</option>
              </select>
            </label>
            <label>
              Number of Teams
              <input
                type="number"
                min="1"
                value={numberOfTeams}
                onChange={(e) => handleTeamCountChange(e.target.value)}
              />
            </label>
            <label>
              Total Budget per Team ($)
              <input
                type="number"
                min="0"
                value={budgetPerTeam}
                onChange={(e) => setBudgetPerTeam(Number(e.target.value))}
              />
            </label>
          </div>

          <div className="draft-roster-section">
            <h4>Roster Positions</h4>
            <div className="roster-grid">
              {DEFAULT_POSITIONS.map((position) => (
                <label key={position} className="roster-input-item">
                  <span>{position}</span>
                  <input
                    type="number"
                    min="0"
                    value={rosterCounts[position]}
                    onChange={(e) => handleRosterCountChange(position, Number(e.target.value))}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="team-names-section">
            <h4>Team Names</h4>
            <p>Enter a name for each team. Fields update as you change the team count.</p>
            <div className="team-names-grid">
              {teamNames.map((name, index) => (
                <label key={index}>
                  <span>Team {index + 1}</span>
                  <input
                    value={name}
                    placeholder={`Team ${index + 1}`}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </section>

        <aside className="draft-summary-card">
          <h3>Draft Summary</h3>
          <div className="summary-row">
            <span>League</span>
            <strong>{type === "Both" ? "MLB" : type}</strong>
          </div>
          <div className="summary-row">
            <span>Teams</span>
            <strong>{numberOfTeams}</strong>
          </div>
          <div className="summary-row">
            <span>Budget/Team</span>
            <strong>${budgetPerTeam}</strong>
          </div>
          <div className="summary-row">
            <span>Roster Size</span>
            <strong>{rosterSize} players</strong>
          </div>

          {message && <div className="success-message">{message}</div>}
          {error && <div className="error-message">{error}</div>}

          <div className="button-group">
            <button className="primary-btn" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Settings"}
            </button>
            <button type="button" className="secondary-btn" onClick={handleReset} disabled={submitting}>
              Reset to Defaults
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
