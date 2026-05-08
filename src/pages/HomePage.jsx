import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchPlayers, fetchPlayerValuation, undoLastPick } from "../services/api";
import { DraftContext } from "../context/DraftContext";
import { useToast } from "../context/ToastContext";
import "./HomePage.css";
import "./PlayerPage.css";

function Badge({ label, variant }) {
  return <span className={`badge badge-${variant}`}>{label}</span>;
}

function SortIcon({ active, dir }) {
  if (!active) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
  return <span style={{ marginLeft: 4 }}>{dir === "asc" ? "↑" : "↓"}</span>;
}

function buildStatusSnapshot(players) {
  const snapshot = new Map();
  for (const player of players) {
    snapshot.set(String(player.id), {
      name: player.name || "Unknown player",
      status: player.status || "active",
      injuryStatus: player.injuryStatus || "",
    });
  }
  return snapshot;
}

function detectStatusChanges(previousSnapshot, nextPlayers) {
  const changes = [];

  for (const player of nextPlayers) {
    const id = String(player.id);
    const previous = previousSnapshot.get(id);
    if (!previous) continue;

    const nextStatus = player.status || "active";
    const nextInjuryStatus = player.injuryStatus || "";
    if (previous.status === nextStatus && previous.injuryStatus === nextInjuryStatus) continue;

    changes.push({
      name: player.name || previous.name || "Unknown player",
      fromStatus: previous.status,
      toStatus: nextStatus,
      toInjuryStatus: nextInjuryStatus,
    });
  }

  return changes;
}

export default function HomePage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [valuations, setValuations] = useState({});
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [leagueFilter, setLeagueFilter] = useState("");
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const navigate = useNavigate();
  const { draftedPlayerIds, pickHistory, draftId, teams, removeLastPick } = useContext(DraftContext);
  const toast = useToast();
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const statusSnapshotRef = useRef(new Map());
  const hasStatusBaselineRef = useRef(false);
  const latestPlayersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;

    async function loadPlayers() {
      try {
        setLoading(true);
        setError("");
        const data = await fetchPlayers();
        if (!cancelled) {
          const nextPlayers = Array.isArray(data) ? data : [];
          setPlayers(nextPlayers);
          statusSnapshotRef.current = buildStatusSnapshot(nextPlayers);
          hasStatusBaselineRef.current = true;
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
    latestPlayersRef.current = players;
  }, [players]);

  useEffect(() => {
    if (!draftId) return undefined;

    let cancelled = false;
    let pollTimer = null;

    // Reset baseline on draft activation/switch so we only notify on new changes.
    statusSnapshotRef.current = buildStatusSnapshot(latestPlayersRef.current);
    hasStatusBaselineRef.current = true;

    async function pollPlayersForStatusUpdates() {
      try {
        const data = await fetchPlayers();
        if (cancelled) return;

        const nextPlayers = Array.isArray(data) ? data : [];
        const nextSnapshot = buildStatusSnapshot(nextPlayers);

        if (hasStatusBaselineRef.current) {
          const changes = detectStatusChanges(statusSnapshotRef.current, nextPlayers);
          for (const change of changes) {
            const injuryDetail = change.toInjuryStatus ? ` (${change.toInjuryStatus})` : "";
            const message = `${change.name} status changed: ${change.fromStatus} -> ${change.toStatus}${injuryDetail}`;
            const lowerStatus = String(change.toStatus).toLowerCase();
            if (lowerStatus === "injured" || lowerStatus === "suspended" || lowerStatus === "restricted") {
              toast.warning(message);
            } else {
              toast.info(message);
            }
          }
        }

        setPlayers(nextPlayers);
        statusSnapshotRef.current = nextSnapshot;
        hasStatusBaselineRef.current = true;
      } catch {
        // Silent fail: we do not want polling errors to spam toasts.
      }
    }

    pollTimer = setInterval(pollPlayersForStatusUpdates, 30000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [draftId, toast]);

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

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

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

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      let aVal = sortKey === "value" ? (valuations[String(a.id)] ?? null) : a[sortKey];
      let bVal = sortKey === "value" ? (valuations[String(b.id)] ?? null) : b[sortKey];

      // Push nulls/undefined to the bottom regardless of direction
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "string") {
        return sortDir === "asc"
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [filtered, sortKey, sortDir, valuations]);

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

  const thStyle = { cursor: "pointer", userSelect: "none" };

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
            <th className="col-name" style={thStyle} onClick={() => handleSort("name")}>
              Name <SortIcon active={sortKey === "name"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("value")}>
              Value <SortIcon active={sortKey === "value"} dir={sortDir} />
            </th>
            <th>Position</th>
            <th style={thStyle} onClick={() => handleSort("team")}>
              Team <SortIcon active={sortKey === "team"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("league")}>
              League <SortIcon active={sortKey === "league"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("avg")}>
              AVG/ERA <SortIcon active={sortKey === "avg"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("hr")}>
              HR/W <SortIcon active={sortKey === "hr"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("rbi")}>
              RBI/SV <SortIcon active={sortKey === "rbi"} dir={sortDir} />
            </th>
            <th style={thStyle} onClick={() => handleSort("sb")}>
              SB/K <SortIcon active={sortKey === "sb"} dir={sortDir} />
            </th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
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
          {sorted.length === 0 && (
            <tr>
              <td colSpan={10} className="empty-row">No players match your filters.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
