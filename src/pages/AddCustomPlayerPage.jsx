import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCustomPlayer, saveUserPlayerNote } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import "./AddCustomPlayerPage.css";

const POSITION_OPTIONS = ["C", "1B", "2B", "3B", "SS", "OF", "SP", "RP"];
const LEAGUE_OPTIONS = ["AL", "NL"];

function generateCustomPlayerId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function parseNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function AddCustomPlayerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [name, setName] = useState("");
  const [team, setTeam] = useState("");
  const [position, setPosition] = useState("OF");
  const [league, setLeague] = useState("AL");
  const [avg, setAvg] = useState("0");
  const [hr, setHr] = useState("0");
  const [rbi, setRbi] = useState("0");
  const [sb, setSb] = useState("0");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSaveCustomPlayer() {
    if (!name.trim() || !team.trim()) {
      toast.error("Player name and team are required.");
      return;
    }

    setSaving(true);
    try {
      let createdPlayer = null;
      let lastError = null;

      // Retry a few times in the rare case of generated ID collision
      for (let i = 0; i < 3; i += 1) {
        const payload = {
          playerId: generateCustomPlayerId(),
          name: name.trim(),
          team: team.trim().toUpperCase(),
          position: [position],
          league,
          isPitcher: position === "SP" || position === "RP",
          stats: {
            BA: parseNumber(avg),
            HR: parseNumber(hr),
            RBI: parseNumber(rbi),
            SB: parseNumber(sb),
          },
          statsHistory: [],
          status: "active",
        };

        try {
          createdPlayer = await createCustomPlayer(payload);
          break;
        } catch (err) {
          lastError = err;
          if (!String(err.message || "").toLowerCase().includes("already exists")) {
            throw err;
          }
        }
      }

      if (!createdPlayer) {
        throw lastError || new Error("Unable to create custom player.");
      }

      if (notes.trim() && user?.username) {
        await saveUserPlayerNote(user.username, String(createdPlayer.playerId), notes.trim());
      }

      toast.success("Custom player created.");
      navigate(`/player/${encodeURIComponent(String(createdPlayer.playerId))}`);
    } catch (err) {
      toast.error(`Failed to create player: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-custom-player-page">
      <button className="custom-back-btn" onClick={() => navigate(-1)}>
        &larr; Back
      </button>

      <section className="custom-player-card">
        <h2>Add Custom Player</h2>

        <div className="custom-form-grid">
          <div className="custom-field">
            <label htmlFor="custom-name">Player Name</label>
            <input
              id="custom-name"
              type="text"
              placeholder="Enter player name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="custom-field">
            <label htmlFor="custom-team">Team</label>
            <input
              id="custom-team"
              type="text"
              placeholder="e.g., NYY"
              value={team}
              onChange={(e) => setTeam(e.target.value)}
            />
          </div>

          <div className="custom-field">
            <label htmlFor="custom-position">Position</label>
            <select
              id="custom-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            >
              {POSITION_OPTIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          </div>

          <div className="custom-field">
            <label htmlFor="custom-league">League</label>
            <select id="custom-league" value={league} onChange={(e) => setLeague(e.target.value)}>
              {LEAGUE_OPTIONS.map((lg) => (
                <option key={lg} value={lg}>
                  {lg}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="custom-stats-grid">
          <div className="custom-field">
            <label htmlFor="custom-avg">AVG</label>
            <input id="custom-avg" type="number" step="0.001" value={avg} onChange={(e) => setAvg(e.target.value)} />
          </div>
          <div className="custom-field">
            <label htmlFor="custom-hr">HR</label>
            <input id="custom-hr" type="number" value={hr} onChange={(e) => setHr(e.target.value)} />
          </div>
          <div className="custom-field">
            <label htmlFor="custom-rbi">RBI</label>
            <input id="custom-rbi" type="number" value={rbi} onChange={(e) => setRbi(e.target.value)} />
          </div>
          <div className="custom-field">
            <label htmlFor="custom-sb">SB</label>
            <input id="custom-sb" type="number" value={sb} onChange={(e) => setSb(e.target.value)} />
          </div>
        </div>

        <button className="save-custom-btn" onClick={handleSaveCustomPlayer} disabled={saving}>
          {saving ? "Saving..." : "Save Custom Player"}
        </button>
      </section>

      <section className="custom-notes-card">
        <h3>Player Notes</h3>
        <textarea
          placeholder="Add notes about this player..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
      </section>
    </div>
  );
}
