import { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPlayers, fetchPlayerValuation, undoLastPick } from "../services/api";
import { DraftContext } from "../context/DraftContext";
import { useToast } from "../context/ToastContext";
import "./HomePage.css";
import "./PlayerPage.css";

function Badge({ label, variant }) {
  return <span className={`badge badge-${variant}`}>{label}</span>;
}
export default function HomePage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [valuations, setValuations] = useState({});
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [sortKey, setSortKey] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const navigate = useNavigate();
  const { draftedPlayerIds, pickHistory, draftId, teams, removeLastPick } = useContext(DraftContext);
  const toast = useToast();
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [undoing, setUndoing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchPlayers();
        if (!cancelled) {
          setPlayers(Array.isArray(data) ? data : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Failed to load players");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadValuations() {
      if (!draftId || players.length === 0) {
        setValuations({});
        return;
      }

      const ids = players
        .map((p) => p?.id)
        .filter((id) => id !== undefined && id !== null)
        .map((id) => String(id))
        .filter((id) => !draftedPlayerIds.has(id));

      const results = await Promise.allSettled(
        ids.map(async (id) => {
          const data = await fetchPlayerValuation(id);
          return { id, value: data?.value };
        })
      );

      if (cancelled) return;

      const next = {};
      for (const r of results) {
        if (r.status === "fulfilled" && r.value && r.value.id) {
          next[r.value.id] = r.value.value;
        }
      }
      setValuations(next);
    }

    loadValuations();

    return () => {
      cancelled = true;
    };
  }, [draftId, pickHistory.length, players, draftedPlayerIds]);

  const lastPick = pickHistory.length > 0 ? pickHistory[pickHistory.length - 1] : null;

  const lastPickTeamName = lastPick
    ? (lastPick.teamName || teams.find((t) => t._id === String(lastPick.teamId))?.name || "Unknown team")
    : null;

  async function handleConfirmUndo() {
    if (!draftId || !lastPick) return;
    setUndoing(true);
    try {
      await undoLastPick(draftId);
      removeLastPick();
      setConfirmingUndo(false);
      toast.success(`Undid pick: ${lastPick.playerName} returned to available players.`);
    } catch (err) {
      toast.error(`Failed to undo pick: ${err.message}`);
    } finally {
      setUndoing(false);
    }
  }

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const getSortValue = (player, key) => {
    switch (key) {
      case "name":
        return player.name?.toLowerCase() ?? "";
      case "value": {
        const value = valuations[String(player.id)];
        return typeof value === "number" ? value : null;
      }
      case "position": {
        const positions = Array.isArray(player.position)
          ? player.position
          : player.position
          ? [player.position]
          : [];
        return positions.join(", ").toLowerCase();
      }
      case "team":
        return player.team?.toLowerCase() ?? "";
      case "league":
        return player.league?.toLowerCase() ?? "";
      case "avg":
        return typeof player.avg === "number" ? player.avg : null;
      case "hr":
        return typeof player.hr === "number" ? player.hr : null;
      case "rbi":
        return typeof player.rbi === "number" ? player.rbi : null;
      case "sb":
        return typeof player.sb === "number" ? player.sb : null;
      default:
        return "";
    }
  };

  const allPositions = useMemo(() => {
    const posSet = new Set();
    players.forEach((p) => {
      const positions = Array.isArray(p.position) ? p.position : p.position ? [p.position] : [];
      positions.forEach((pos) => posSet.add(pos));
    });
    return [...posSet].sort();
  }, [players]);

  const allLeagues = useMemo(
    () => [...new Set(players.map((p) => p.league).filter(Boolean))].sort(),
    [players]
  );

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (draftedPlayerIds.has(String(p.id))) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (posFilter) {
        const positions = Array.isArray(p.position) ? p.position : p.position ? [p.position] : [];
        if (!positions.includes(posFilter)) return false;
      }
      if (leagueFilter && p.league !== leagueFilter) return false;
      return true;
    });
  }, [players, search, posFilter, leagueFilter, draftedPlayerIds]);

  const sortedPlayers = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const aValue = getSortValue(a, sortKey);
      const bValue = getSortValue(b, sortKey);

      const aMissing = aValue === null || aValue === undefined || aValue === "";
      const bMissing = bValue === null || bValue === undefined || bValue === "";

      if (aMissing && bMissing) return 0;
      if (aMissing) return sortOrder === "asc" ? 1 : -1;
      if (bMissing) return sortOrder === "asc" ? -1 : 1;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });
    return list;
  }, [filtered, sortKey, sortOrder, valuations]);

  if (loading) {
    return (
      <div className="home">
        <div className="home-header">
          <h2>Available Players</h2>
        </div>
        <p className="home-count">Loading players...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home">
        <div className="home-header">
          <h2>Available Players</h2>
        </div>
        <p className="home-count">{error}</p>
      </div>
    );
  }

  return (
    <div className="home">
      <div className="home-header">
        <div>
          <h2>Available Players</h2>
          <span className="home-count">{filtered.length} players available</span>
        </div>
        {lastPick && !confirmingUndo && (
          <button className="undo-btn" onClick={() => setConfirmingUndo(true)}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 6h7a5 5 0 1 1 0 10H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M5 3L2 6l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Undo Last Pick
          </button>
        )}
      </div>

      {confirmingUndo && lastPick && (
        <div className="undo-confirm-bar">
          <span className="undo-confirm-text">
            Undo <strong>{lastPick.playerName}</strong> → {lastPickTeamName} for{" "}
            <strong>${lastPick.price}</strong>?
          </span>
          <div className="undo-confirm-actions">
            <button
              className="undo-confirm-yes"
              onClick={handleConfirmUndo}
              disabled={undoing}
            >
              {undoing ? "Undoing…" : "Yes, undo"}
            </button>
            <button
              className="undo-confirm-cancel"
              onClick={() => setConfirmingUndo(false)}
              disabled={undoing}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="home-toolbar">
        <div className="search-box">
          <svg className="search-icon" width="15" height="15" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <select value={posFilter} onChange={(e) => setPosFilter(e.target.value)}>
            <option value="">All Position</option>
            {allPositions.map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <select value={leagueFilter} onChange={(e) => setLeagueFilter(e.target.value)}>
            <option value="">All League</option>
            {allLeagues.map((lg) => (
              <option key={lg} value={lg}>{lg}</option>
            ))}
          </select>
        </div>
      </div>

      <table className="players-table">
        <thead>
          <tr>
            <th className="col-name sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("name")}
                aria-label={`Sort by name ${sortKey === "name" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                Name
                <span className="sort-indicator">{sortKey === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("value")}
                aria-label={`Sort by value ${sortKey === "value" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                Value
                <span className="sort-indicator">{sortKey === "value" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("position")}
                aria-label={`Sort by position ${sortKey === "position" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                Position
                <span className="sort-indicator">{sortKey === "position" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("team")}
                aria-label={`Sort by team ${sortKey === "team" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                Team
                <span className="sort-indicator">{sortKey === "team" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("league")}
                aria-label={`Sort by league ${sortKey === "league" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                League
                <span className="sort-indicator">{sortKey === "league" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("avg")}
                aria-label={`Sort by average or ERA ${sortKey === "avg" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                AVG/ERA
                <span className="sort-indicator">{sortKey === "avg" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("hr")}
                aria-label={`Sort by home runs or wins ${sortKey === "hr" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                HR/W
                <span className="sort-indicator">{sortKey === "hr" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("rbi")}
                aria-label={`Sort by RBI or saves ${sortKey === "rbi" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                RBI/SV
                <span className="sort-indicator">{sortKey === "rbi" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th className="sortable">
              <button type="button" className="sort-button" onClick={() => handleSort("sb")}
                aria-label={`Sort by stolen bases or strikeouts ${sortKey === "sb" ? (sortOrder === "asc" ? "descending" : "ascending") : "ascending"}`}>
                SB/K
                <span className="sort-indicator">{sortKey === "sb" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}</span>
              </button>
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((p) => (
            <tr key={p.id}>
              <td className="col-name">{p.name}</td>
              <td>{Number.isFinite(valuations[String(p.id)]) ? `$${valuations[String(p.id)]}` : "-"}</td>
              <td>
                <div className="badge-row">
                  {(Array.isArray(p.position) ? p.position : p.position ? [p.position] : []).map((pos) => (
                    <Badge key={pos} label={pos} variant="position" />
                  ))}
                </div>
              </td>
              <td>{p.team}</td>
              <td>
                <span className={`league-badge ${p.league === "AL" ? "league-al" : "league-nl"}`}>
                  {p.league}
                </span>
              </td>
              <td>{typeof p.avg === "number" ? (p.isPitcher ? p.avg.toFixed(2) : p.avg.toFixed(3)) : "-"}</td>
              <td>{p.hr}</td>
              <td>{p.rbi}</td>
              <td>{p.sb}</td>
              <td>
                <button
                  className="view-btn"
                  onClick={() => navigate(`/player/${encodeURIComponent(String(p.id))}`)}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={10} className="empty-row">No players match your filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
