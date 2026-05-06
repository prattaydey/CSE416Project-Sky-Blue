const express = require("express");
const authMiddleware = require("../middleware/auth");
const Team = require("../models/team.model");

const router = express.Router();

//AI generated routes
// Retrieves a team's current state, including draft settings and roster details.
// Used by the app to display team composition and league context during drafting.
router.get("/:teamId", async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId).populate("draft", "rosterSlots numberOfTeams budgetPerTeam type statCategories");

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    return res.json({
      id: team._id,
      name: team.name,
      draft: team.draft
        ? {
            id: team.draft._id,
            type: team.draft.type,
            numberOfTeams: team.draft.numberOfTeams,
            budgetPerTeam: team.draft.budgetPerTeam,
            rosterSlots: team.draft.rosterSlots,
            statCategories: team.draft.statCategories,
          }
        : null,
      budgetRemaining: team.budgetRemaining,
      roster: team.roster,
    });
  } catch (error) {
    return next(error);
  }
});

// Removes a player from a team's roster and credits their spend back to budget.
// Supports undo/correction flows when draft picks need to be reverted.
router.delete("/:teamId/roster/:playerId", authMiddleware, async (req, res, next) => {
  try {
    const { teamId, playerId } = req.params;
    const team = await Team.findById(teamId).populate('draft');

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const rosterItem = team.roster.find((item) => item.playerId === playerId);
    if (!rosterItem) {
      return res.status(404).json({ error: "Player not found on roster" });
    }

    team.roster = team.roster.filter((item) => item.playerId !== playerId);
    team.budgetRemaining = Math.max(0, team.budgetRemaining + rosterItem.amountPaid);
    await team.save();

    // Also remove from draft pick history if it exists
    if (team.draft) {
      team.draft.pickHistory = team.draft.pickHistory.filter((pick) => pick.playerId !== playerId);
      await team.draft.save();
    }

    return res.json({
      id: team._id,
      name: team.name,
      draft: team.draft,
      budgetRemaining: team.budgetRemaining,
      roster: team.roster,
    });
  } catch (error) {
    return next(error);
  }
});

// AI generated endpoint to swap a player's position on the roster
router.put("/:teamId/swap", authMiddleware, async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const { playerId, newPosition } = req.body || {};

    if (!playerId || typeof playerId !== "string" || playerId.trim() === "") {
      return res.status(400).json({ error: "playerId is required and must be a non-empty string" });
    }

    if (!newPosition || typeof newPosition !== "string" || newPosition.trim() === "") {
      return res.status(400).json({ error: "newPosition is required and must be a non-empty string" });
    }

    const team = await Team.findById(teamId).populate("draft");
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    const rosterItem = team.roster.find((item) => item.playerId === playerId);
    if (!rosterItem) {
      return res.status(404).json({ error: "Player not found on this team's roster" });
    }

    if (rosterItem.position === newPosition.trim()) {
      return res.status(400).json({ error: "Player is already assigned to that position" });
    }

    // Check that the new position has an open slot on this team 
    if (team.draft) {
      const slot = team.draft.rosterSlots.find((s) => s.position === newPosition.trim());
      if (!slot) {
        return res.status(400).json({
          error: `Position "${newPosition}" is not a valid roster slot in this draft`,
        });
      }

      const filledCount = team.roster.filter(
        (item) => item.playerId !== playerId && item.position === newPosition.trim()
      ).length;

      if (filledCount >= slot.count) {
        return res.status(400).json({
          error: `No open ${newPosition} slots — all ${slot.count} slot(s) are filled`,
        });
      }
    }

    // Apply the position swap
    rosterItem.position = newPosition.trim();

    // Keep draft pick history in sync
    if (team.draft) {
      const pickEntry = team.draft.pickHistory.find(
        (pick) => pick.playerId === playerId && pick.teamId.toString() === teamId
      );
      if (pickEntry) {
        pickEntry.position = newPosition.trim();
        await team.draft.save();
      }
    }

    await team.save();

    return res.json({
      id: team._id,
      name: team.name,
      budgetRemaining: team.budgetRemaining,
      roster: team.roster,
      swapped: {
        playerId,
        playerName: rosterItem.playerName,
        newPosition: newPosition.trim(),
      },
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
