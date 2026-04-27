const express = require("express");
const mongoose = require("mongoose");
const Draft = require("../models/draft.model");
const Team = require("../models/team.model");
const User = require("../models/user.model");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

//AI generated routes/functions
// Validates and standardizes roster slot input so each team has a consistent draft setup.
// This ensures roster rules are clean before creating a new draft.
function normalizeRosterSlots(rosterSlots) {
  if (!Array.isArray(rosterSlots) || rosterSlots.length === 0) {
    return null;
  }

  return rosterSlots.map((slot) => {
    if (
      !slot ||
      typeof slot.position !== "string" ||
      slot.position.trim() === "" ||
      typeof slot.count !== "number" ||
      slot.count < 0 ||
      !Number.isInteger(slot.count)
    ) {
      return null;
    }

    return {
      position: slot.position.trim(),
      count: slot.count,
    };
  });
}

function normalizeStatCategories(statCategories) {
  if (!statCategories || typeof statCategories !== "object") {
    return null;
  }

  const normalizeList = (list) => {
    if (!Array.isArray(list) || list.length === 0) {
      return null;
    }

    const normalized = Array.from(new Set(
      list
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter((item) => item !== "")
    ));

    return normalized.length > 0 ? normalized : null;
  };

  const hitters = normalizeList(statCategories.hitters);
  const pitchers = normalizeList(statCategories.pitchers);

  return hitters && pitchers ? { hitters, pitchers } : null;
}

// Creates a new draft and all associated teams in a single transaction.
// Also links the authenticated user to that draft so they can immediately enter the draft flow.
router.post("/", authMiddleware, async (req, res, next) => {
  const { type, numberOfTeams, budgetPerTeam, rosterSlots, teamNames, statCategories } = req.body || {};

  if (!type || !["AL", "NL", "Both"].includes(type)) {
    return res.status(400).json({ error: "type must be one of AL, NL, Both" });
  }

  if (!Number.isInteger(numberOfTeams) || numberOfTeams < 1) {
    return res.status(400).json({ error: "numberOfTeams must be an integer greater than 0" });
  }

  if (typeof budgetPerTeam !== "number" || budgetPerTeam < 0) {
    return res.status(400).json({ error: "budgetPerTeam must be a non-negative number" });
  }

  const normalizedSlots = normalizeRosterSlots(rosterSlots);
  if (!normalizedSlots || normalizedSlots.some((slot) => slot === null)) {
    return res.status(400).json({ error: "rosterSlots must be an array of { position, count } objects" });
  }

  const normalizedStatCategories = normalizeStatCategories(statCategories);
  if (!normalizedStatCategories) {
    return res.status(400).json({
      error: "statCategories must include non-empty hitters and pitchers arrays",
    });
  }

  if (teamNames !== undefined) {
    if (!Array.isArray(teamNames) || teamNames.length !== numberOfTeams) {
      return res.status(400).json({ error: "teamNames must be an array that matches numberOfTeams" });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const draft = await Draft.create(
      [
        {
          type,
          numberOfTeams,
          budgetPerTeam,
          rosterSlots: normalizedSlots,
          statCategories: normalizedStatCategories,
        },
      ],
      { session }
    );

    const draftDoc = draft[0];

    const teams = Array.from({ length: numberOfTeams }, (_, index) => ({
      name: teamNames?.[index] || `Team ${index + 1}`,
      draft: draftDoc._id,
      budgetRemaining: budgetPerTeam,
      roster: [],
    }));

    const createdTeams = await Team.insertMany(teams, { session });

    await User.findByIdAndUpdate(
      req.user.id,
      {
        $addToSet: { drafts: draftDoc._id },
        activeDraft: draftDoc._id,
      },
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({ draft: draftDoc, teams: createdTeams });
  } catch (error) {
    await session.abortTransaction();
    return next(error);
  } finally {
    session.endSession();
  }
});

// Returns a draft and every team associated with it by draft ID.
// Used to load the draft room state and team list for active draft sessions.
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;

    const draft = await Draft.findById(id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const teams = await Team.find({ draft: draft._id });

    return res.json({ draft, teams });
  } catch (error) {
    return next(error);
  }
});

// Posts a draft pick: assigns a player to a team, updates roster and budget, records pick history
router.post("/:draftId/picks", authMiddleware, async (req, res, next) => {
  try {
    const { draftId } = req.params;
    const { playerId, playerName, position, price, teamId, nominatorTeamId } = req.body || {};

    // Validation
    if (!playerId || typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId is required and must be a non-empty string" });
    }

    if (!playerName || typeof playerName !== "string" || playerName.trim() === "") {
      return res.status(400).json({ error: "playerName is required and must be a non-empty string" });
    }

    if (!position || typeof position !== "string" || position.trim() === "") {
      return res.status(400).json({ error: "position is required and must be a non-empty string" });
    }

    if (typeof price !== "number" || price < 0) {
      return res.status(400).json({ error: "price is required and must be a non-negative number" });
    }

    if (!teamId || typeof teamId !== "string") {
      return res.status(400).json({ error: "teamId is required and must be a valid ObjectId string" });
    }

    if (!nominatorTeamId || typeof nominatorTeamId !== "string") {
      return res.status(400).json({ error: "nominatorTeamId is required and must be a valid ObjectId string" });
    }

    // Verify draft exists
    const draft = await Draft.findById(draftId);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    // Verify team exists and belongs to this draft
    const team = await Team.findById(teamId);
    if (!team || team.draft.toString() !== draftId) {
      return res.status(404).json({ error: "Team not found or does not belong to this draft" });
    }

    // Verify nominator team exists and belongs to this draft
    const nominatorTeam = await Team.findById(nominatorTeamId);
    if (!nominatorTeam || nominatorTeam.draft.toString() !== draftId) {
      return res.status(404).json({ error: "Nominator team not found or does not belong to this draft" });
    }

    // Check if team has enough budget
    if (team.budgetRemaining < price) {
      return res.status(400).json({ error: "Team does not have enough budget for this pick" });
    }

    // Add player to team roster
    const rosterItem = {
      playerId,
      playerName,
      position,
      amountPaid: price,
    };

    team.roster.push(rosterItem);
    team.budgetRemaining -= price;

    await team.save();

    // Add to draft pick history
    draft.pickHistory.push({
      playerId,
      playerName,
      position,
      price,
      teamId,
      nominatorTeamId,
      timestamp: new Date(),
    });

    await draft.save();

    return res.status(201).json({
      message: "Player drafted successfully",
      team,
      draft,
    });
  } catch (error) {
    return next(error);
  }
});

// Undoes the most recent pick: removes the player from the team roster,
// credits the price back to budget, and pops the last entry from pickHistory.
router.delete("/:draftId/picks/last", authMiddleware, async (req, res, next) => {
  try {
    const { draftId } = req.params;

    const draft = await Draft.findById(draftId);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    if (!draft.pickHistory || draft.pickHistory.length === 0) {
      return res.status(400).json({ error: "No picks to undo" });
    }

    const lastPick = draft.pickHistory[draft.pickHistory.length - 1];

    const team = await Team.findById(lastPick.teamId);
    if (team) {
      const rosterItem = team.roster.find((item) => item.playerId === lastPick.playerId);
      if (rosterItem) {
        team.roster = team.roster.filter((item) => item.playerId !== lastPick.playerId);
        team.budgetRemaining += rosterItem.amountPaid;
        await team.save();
      }
    }

    draft.pickHistory.pop();
    await draft.save();

    return res.json({ pick: lastPick, team, draft });
  } catch (error) {
    return next(error);
  }
});
// AI generated route to compare teams in a draft based on their rosters, budgets, and compiled stats.
router.get("/:id/compare", async (req, res, next) => {
  try {
    const { id } = req.params;

    const draft = await Draft.findById(id);
    if (!draft) {
      return res.status(404).json({ error: "Draft not found" });
    }

    const teams = await Team.find({ draft: draft._id });

    const statCategories = draft.statCategories || { hitters: [], pitchers: [] };
    const allStatKeys = [
      ...statCategories.hitters,
      ...statCategories.pitchers,
    ];

    // Pitching positions used to classify players
    const PITCHING_POSITIONS = new Set(["SP", "RP", "P", "CL"]);

    function isPitcher(position) {
      if (!position) return false;
      const pos = String(position).toUpperCase().trim();
      return PITCHING_POSITIONS.has(pos) || pos.includes("P");
    }

    // Build positional strength breakdown per team based on rosterSlots
    function buildPositionalStrengths(roster, rosterSlots) {
      return rosterSlots.map((slot) => {
        const filled = roster.filter(
          (item) => item.position === slot.position
        ).length;
        return {
          position: slot.position,
          required: slot.count,
          filled,
          complete: filled >= slot.count,
        };
      });
    }

    const teamStats = teams.map((team) => {
      const roster = team.roster || [];
      const hitters = roster.filter((item) => !isPitcher(item.position));
      const pitchers = roster.filter((item) => isPitcher(item.position));

      const totalSpent = roster.reduce(
        (sum, item) => sum + (Number(item.amountPaid) || 0),
        0
      );
      const budgetTotal = draft.budgetPerTeam;
      const budgetRemaining = team.budgetRemaining;

      // Total roster slots required
      const totalSlotsRequired = (draft.rosterSlots || []).reduce(
        (sum, slot) => sum + slot.count,
        0
      );
      const rosterCompleteness =
        totalSlotsRequired > 0
          ? Math.round((roster.length / totalSlotsRequired) * 100)
          : 0;

      // Build compiled stats — we track totals and averages from the draft's
      // chosen stat categories. Since we only have aggregated roster data
      // we compute roster-level metrics
      // that map to common stat category names.
      const rosterStatMap = {
        // Hitter counting stats (totals)
        hr: hitters.reduce((s, p) => s + (Number(p.hr) || 0), 0),
        rbi: hitters.reduce((s, p) => s + (Number(p.rbi) || 0), 0),
        r: hitters.reduce((s, p) => s + (Number(p.r) || 0), 0),
        sb: hitters.reduce((s, p) => s + (Number(p.sb) || 0), 0),
        h: hitters.reduce((s, p) => s + (Number(p.h) || 0), 0),
        // Hitter averages
        avg: hitters.length
          ? parseFloat(
              (
                hitters.reduce((s, p) => s + (Number(p.avg) || 0), 0) /
                hitters.length
              ).toFixed(3)
            )
          : null,
        obp: hitters.length
          ? parseFloat(
              (
                hitters.reduce((s, p) => s + (Number(p.obp) || 0), 0) /
                hitters.length
              ).toFixed(3)
            )
          : null,
        // Pitcher counting stats
        w: pitchers.reduce((s, p) => s + (Number(p.w) || 0), 0),
        sv: pitchers.reduce((s, p) => s + (Number(p.sv) || 0), 0),
        k: pitchers.reduce((s, p) => s + (Number(p.k) || 0), 0),
        ks: pitchers.reduce((s, p) => s + (Number(p.k) || 0), 0),
        // Pitcher averages
        era: pitchers.length
          ? parseFloat(
              (
                pitchers.reduce((s, p) => s + (Number(p.era) || 0), 0) /
                pitchers.length
              ).toFixed(2)
            )
          : null,
        whip: pitchers.length
          ? parseFloat(
              (
                pitchers.reduce((s, p) => s + (Number(p.whip) || 0), 0) /
                pitchers.length
              ).toFixed(2)
            )
          : null,
      };

      // Only surface stats the draft was configured to track
      const compiledStats = {};
      for (const key of allStatKeys) {
        const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
        if (rosterStatMap[normalized] !== undefined) {
          compiledStats[key] = rosterStatMap[normalized];
        } else {
          compiledStats[key] = null;
        }
      }

      const positionalStrengths = buildPositionalStrengths(
        roster,
        draft.rosterSlots || []
      );

      return {
        teamId: team._id,
        teamName: team.name,
        rosterCount: roster.length,
        hitterCount: hitters.length,
        pitcherCount: pitchers.length,
        budgetTotal,
        budgetSpent: totalSpent,
        budgetRemaining,
        rosterCompleteness,
        positionalStrengths,
        compiledStats,
      };
    });

    return res.json({
      draftId: draft._id,
      statCategories,
      rosterSlots: draft.rosterSlots,
      budgetPerTeam: draft.budgetPerTeam,
      teams: teamStats,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
