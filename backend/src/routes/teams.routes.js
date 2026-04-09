const express = require("express");
const Team = require("../models/team.model");

const router = express.Router();

//AI generated routes

router.get("/:teamId", async (req, res, next) => {
  try {
    const { teamId } = req.params;
    const team = await Team.findById(teamId);

    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }

    return res.json({
      id: team._id,
      name: team.name,
      draft: team.draft,
      budgetRemaining: team.budgetRemaining,
      amountSpent: team.amountSpent,
      roster: team.roster,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
