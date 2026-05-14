const express = require("express");
const authMiddleware = require("../middleware/auth");
const env = require("../config/env");
const User = require("../models/user.model");
const Draft = require("../models/draft.model");

const router = express.Router();

const ALLOWED_ROTO_CATEGORIES = {
  hitters: new Set(["BA", "OBP", "HR", "R", "RBI", "SB", "H"]),
  pitchers: new Set(["ERA", "WHIP", "W", "SV", "K", "QS"]),
};

const CATEGORY_ALIASES = {
  AVG: "BA",
  RB: "RBI",
  SO: "K",
};

function isPitchingPosition(position) {
  const pos = String(position || "").toUpperCase();
  return pos === "P" || pos === "SP" || pos === "RP" || pos === "CL" || pos.includes("P");
}

function buildRosterSpots(rosterSlots) {
  if (!Array.isArray(rosterSlots)) {
    return undefined;
  }

  let hitters = 0;
  let pitchers = 0;
  for (const slot of rosterSlots) {
    const count = Number(slot?.count);
    if (!Number.isFinite(count) || count <= 0) continue;

    if (isPitchingPosition(slot?.position)) {
      pitchers += Math.floor(count);
    } else {
      hitters += Math.floor(count);
    }
  }

  return hitters > 0 && pitchers > 0 ? { hitters, pitchers } : undefined;
}

function buildDraftedPlayers(draft) {
  return (draft.pickHistory || [])
    .map((pick) => ({
      playerId: Number(pick.playerId),
      price: Number(pick.price),
      position: pick.position,
    }))
    .filter((p) => Number.isInteger(p.playerId) && Number.isFinite(p.price) && p.price >= 0);
}

function normalizeCategoriesForRole(categories, role) {
  if (!Array.isArray(categories)) {
    return [];
  }

  const allowed = ALLOWED_ROTO_CATEGORIES[role];
  return Array.from(new Set(
    categories
      .map((category) => String(category || "").trim().toUpperCase())
      .map((category) => CATEGORY_ALIASES[category] || category)
      .filter((category) => allowed.has(category))
  ));
}

function buildCategories(statCategories) {
  const hitters = normalizeCategoriesForRole(statCategories?.hitters, "hitters");
  const pitchers = normalizeCategoriesForRole(statCategories?.pitchers, "pitchers");

  return hitters.length > 0 && pitchers.length > 0 ? { hitters, pitchers } : undefined;
}

function buildValuationPayload(draft, extra = {}) {
  const rosterSpots = buildRosterSpots(draft.rosterSlots || []);
  const categories = buildCategories(draft.statCategories);

  return {
    ...extra,
    leagueSettings: {
      budget: Number(draft.budgetPerTeam),
      teams: Number(draft.numberOfTeams),
      scoringSystem: "roto",
      ...(rosterSpots ? { rosterSpots } : {}),
      ...(categories ? { categories } : {}),
    },
    draftState: {
      playersDrafted: buildDraftedPlayers(draft),
    },
  };
}

async function loadActiveDraft(userId) {
  const user = await User.findById(userId).select("activeDraft");
  if (!user?.activeDraft) {
    return { errorStatus: 400, error: "No active draft selected" };
  }

  const draft = await Draft.findById(user.activeDraft).select(
    "numberOfTeams budgetPerTeam rosterSlots statCategories pickHistory"
  );
  if (!draft) {
    return { errorStatus: 404, error: "Draft not found" };
  }

  return { draft };
}

async function requestDraftKitValuation(path, body) {
  if (!env.draftKitAppClientKey) {
    return { status: 500, payload: { error: "Missing DRAFTKIT_APP_CLIENT_KEY on client backend" } };
  }

  const base = String(env.draftKitApiUrl || "").replace(/\/+$/, "");
  const upstream = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.draftKitAppClientKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await upstream.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  return {
    ok: upstream.ok,
    status: upstream.status,
    payload,
  };
}

router.post("/valuation/all", authMiddleware, async (req, res, next) => {
  try {
    const { draft, errorStatus, error } = await loadActiveDraft(req.user.id);
    if (!draft) {
      return res.status(errorStatus).json({ error });
    }

    const playerIds = Array.isArray(req.body?.playerIds)
      ? req.body.playerIds.map(Number).filter((id) => Number.isInteger(id))
      : undefined;

    if (Array.isArray(playerIds) && playerIds.length === 0) {
      return res.json({ values: [] });
    }

    const payload = buildValuationPayload(draft, playerIds ? { playerIds } : {});
    const upstreamPath = playerIds ? "/api/players/value" : "/api/players/value/all";
    const upstream = await requestDraftKitValuation(upstreamPath, payload);

    if (!upstream.ok) {
      return res.status(upstream.status).json(upstream.payload || { error: "Upstream valuation request failed" });
    }

    return res.json(upstream.payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/:playerId/valuation", authMiddleware, async (req, res, next) => {
  try {
    const playerId = Number(String(req.params.playerId || "").trim());
    if (!Number.isInteger(playerId)) {
      return res.status(400).json({ error: "playerId must be a numeric MLB integer ID" });
    }

    const { draft, errorStatus, error } = await loadActiveDraft(req.user.id);
    if (!draft) {
      return res.status(errorStatus).json({ error });
    }

    const payload = buildValuationPayload(draft, { playerId });
    const upstream = await requestDraftKitValuation("/api/player/value", payload);

    if (!upstream.ok) {
      return res.status(upstream.status).json(upstream.payload || { error: "Upstream valuation request failed" });
    }

    return res.json(upstream.payload);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
