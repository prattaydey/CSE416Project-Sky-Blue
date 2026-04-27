// AI generated — Fantasy Teams Comparison page
import { useContext, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { fetchDraftCompare } from "../services/api";
import { DraftContext } from "../context/DraftContext";
import "./ComparisonPage.css";

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Determine whether lower or higher is "better" for a given stat key
function higherIsBetter(statKey) {
  const lower = ["era", "whip"];
  return !lower.includes(statKey.toLowerCase());
}

// Given a list of numeric values, return index of best and worst (ignoring nulls)
function getBestWorstIdx(values, statKey) {
  const nums = values.map((v) => (v === null || v === undefined ? NaN : Number(v)));
  const valid = nums.filter((n) => !isNaN(n));
  if (valid.length < 2) return { bestIdx: -1, worstIdx: -1 };

  const best = higherIsBetter(statKey) ? Math.max(...valid) : Math.min(...valid);
  const worst = higherIsBetter(statKey) ? Math.min(...valid) : Math.max(...valid);

  return {
    bestIdx: nums.indexOf(best),
    worstIdx: best === worst ? -1 : nums.indexOf(worst),
  };
}

function StatCell({ value, isBest, isWorst, isAverage }) {
  if (value === null || value === undefined) {
    return <span className="stat-null">—</span>;
  }
  const display =
    typeof value === "number" && !Number.isInteger(value)
      ? value.toFixed(value < 1 ? 3 : 2)
      : value;

  if (isBest) return <span className="stat-best">{display}</span>;
  if (isWorst) return <span className="stat-worst">{display}</span>;
  return <>{display}</>;
}

function CompletenessCell({ pct }) {
  return (
    <div className="completeness-cell">
      <div className="completeness-bar">
        <div
          className="completeness-bar-fill"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <span className="completeness-pct">{pct}%</span>
    </div>
  );
}

function PosChip({ pos, filled, required }) {
  const cls =
    filled >= required
      ? "pos-chip pos-chip-complete"
      : filled > 0
      ? "pos-chip pos-chip-partial"
      : "pos-chip pos-chip-empty";
  return (
    <span className={cls}>
      {pos} {filled}/{required}
    </span>
  );
}

export default function ComparisonPage() {
  const { user } = useAuth();
  const { draftId: contextDraftId } = useContext(DraftContext);
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Resolve draft ID: prefer context (live draft), fall back to user's activeDraft
  const activeDraftId = contextDraftId || user?.activeDraft || null;

  useEffect(() => {
    if (!activeDraftId) return;

    let cancelled = false;
    setLoading(true);
    setError("");

    fetchDraftCompare(activeDraftId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load comparison data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeDraftId]);

  // Flatten stat category keys in order: hitters first, then pitchers
  const statKeys = useMemo(() => {
    if (!data) return [];
    return [
      ...(data.statCategories?.hitters || []),
      ...(data.statCategories?.pitchers || []),
    ];
  }, [data]);

  const hitterStatKeys = data?.statCategories?.hitters || [];
  const pitcherStatKeys = data?.statCategories?.pitchers || [];

  // Pre-compute best/worst indexes per stat across all teams
  const highlightMap = useMemo(() => {
    if (!data?.teams) return {};
    const map = {};
    for (const key of statKeys) {
      const values = data.teams.map((t) => t.compiledStats?.[key] ?? null);
      map[key] = getBestWorstIdx(values, key);
    }
    return map;
  }, [data, statKeys]);

  if (!activeDraftId) {
    return (
      <div className="comparison-page">
        <div className="comparison-header">
          <div>
            <h2>Teams Comparison</h2>
            <span className="comparison-subtitle">No draft selected</span>
          </div>
        </div>
        <div className="no-draft-banner">
          <p>You haven&apos;t set up a draft yet. Create one to compare your fantasy teams side by side.</p>
          <button className="go-setup-btn" onClick={() => navigate("/draft-setup")}>
            Go to Draft Setup
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="comparison-page">
        <div className="comparison-header">
          <div>
            <h2>Teams Comparison</h2>
            <span className="comparison-subtitle">Loading…</span>
          </div>
        </div>
        <div className="comparison-loading">Loading comparison data…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comparison-page">
        <div className="comparison-header">
          <div>
            <h2>Teams Comparison</h2>
          </div>
        </div>
        <div className="comparison-error">{error}</div>
      </div>
    );
  }

  if (!data || !data.teams || data.teams.length === 0) {
    return (
      <div className="comparison-page">
        <div className="comparison-header">
          <div>
            <h2>Teams Comparison</h2>
            <span className="comparison-subtitle">No teams found for this draft.</span>
          </div>
        </div>
        <div className="comparison-empty">No teams available to compare.</div>
      </div>
    );
  }

  const teams = data.teams;

  return (
    <div className="comparison-page">
      <div className="comparison-header">
        <div>
          <h2>Teams Comparison</h2>
          <span className="comparison-subtitle">
            {teams.length} teams · side-by-side stats ·{" "}
            <span className="stat-best" style={{ fontSize: "0.78rem", padding: "1px 5px" }}>
              green = best
            </span>{" "}
            <span className="stat-worst" style={{ fontSize: "0.78rem", padding: "1px 5px" }}>
              red = worst
            </span>
          </span>
        </div>
      </div>

      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          {/* ── Team name header row ── */}
          <thead>
            <tr>
              <th></th>
              {teams.map((team) => (
                <th key={team.teamId}>
                  <span
                    className="col-team-name"
                    title={team.teamName}
                    style={{ display: "block", textAlign: "center" }}
                  >
                    {team.teamName}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Budget section ── */}
            <tr>
              <td colSpan={teams.length + 1} className="comparison-section-label">
                Budget
              </td>
            </tr>

            <tr>
              <td>Total Budget</td>
              {teams.map((team) => (
                <td key={team.teamId}>{formatCurrency(team.budgetTotal)}</td>
              ))}
            </tr>

            <tr>
              <td>Spent</td>
              {teams.map((team) => (
                <td key={team.teamId}>
                  <span className="cell-spent">{formatCurrency(team.budgetSpent)}</span>
                </td>
              ))}
            </tr>

            <tr>
              <td>Remaining</td>
              {teams.map((team) => (
                <td key={team.teamId}>
                  <span className="cell-remaining">{formatCurrency(team.budgetRemaining)}</span>
                </td>
              ))}
            </tr>

            {/* ── Roster section ── */}
            <tr>
              <td colSpan={teams.length + 1} className="comparison-section-label">
                Roster
              </td>
            </tr>

            <tr>
              <td>Completeness</td>
              {teams.map((team) => (
                <td key={team.teamId}>
                  <CompletenessCell pct={team.rosterCompleteness} />
                </td>
              ))}
            </tr>

            <tr>
              <td>Players Drafted</td>
              {teams.map((team) => (
                <td key={team.teamId}>{team.rosterCount}</td>
              ))}
            </tr>

            <tr>
              <td>Hitters</td>
              {teams.map((team) => (
                <td key={team.teamId}>{team.hitterCount}</td>
              ))}
            </tr>

            <tr>
              <td>Pitchers</td>
              {teams.map((team) => (
                <td key={team.teamId}>{team.pitcherCount}</td>
              ))}
            </tr>

            {/* ── Positional strengths ── */}
            <tr>
              <td colSpan={teams.length + 1} className="comparison-section-label">
                Positional Strengths
              </td>
            </tr>

            {(data.rosterSlots || []).map((slot) => (
              <tr key={slot.position}>
                <td>{slot.position}</td>
                {teams.map((team) => {
                  const pos = team.positionalStrengths?.find(
                    (p) => p.position === slot.position
                  );
                  return (
                    <td key={team.teamId}>
                      {pos ? (
                        <PosChip
                          pos={slot.position}
                          filled={pos.filled}
                          required={pos.required}
                        />
                      ) : (
                        <span className="stat-null">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* ── Hitter stat categories ── */}
            {hitterStatKeys.length > 0 && (
              <tr>
                <td colSpan={teams.length + 1} className="comparison-section-label">
                  Hitting Categories
                </td>
              </tr>
            )}

            {hitterStatKeys.map((key) => {
              const { bestIdx, worstIdx } = highlightMap[key] || {};
              return (
                <tr key={`stat-${key}`}>
                  <td>{key.toUpperCase()}</td>
                  {teams.map((team, idx) => {
                    const val = team.compiledStats?.[key] ?? null;
                    return (
                      <td key={team.teamId}>
                        <StatCell
                          value={val}
                          isBest={idx === bestIdx}
                          isWorst={idx === worstIdx}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* ── Pitcher stat categories ── */}
            {pitcherStatKeys.length > 0 && (
              <tr>
                <td colSpan={teams.length + 1} className="comparison-section-label">
                  Pitching Categories
                </td>
              </tr>
            )}

            {pitcherStatKeys.map((key) => {
              const { bestIdx, worstIdx } = highlightMap[key] || {};
              return (
                <tr key={`stat-${key}`}>
                  <td>{key.toUpperCase()}</td>
                  {teams.map((team, idx) => {
                    const val = team.compiledStats?.[key] ?? null;
                    return (
                      <td key={team.teamId}>
                        <StatCell
                          value={val}
                          isBest={idx === bestIdx}
                          isWorst={idx === worstIdx}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
