const express = require("express");
const authMiddleware = require("../middleware/auth");
const Team = require("../models/team.model");

const router = express.Router();

//AI generated routes

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

router.delete("/:teamId/roster/:playerId", authMiddleware, async (req, res, next) => {
  try {
    const { teamId, playerId } = req.params;
    const team = await Team.findById(teamId);

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

module.exports = router;
