const express = require("express");
const mongoose = require("mongoose");
const Draft = require("../models/draft.model");
const Team = require("../models/team.model");
const User = require("../models/user.model");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

//AI generated routes
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

module.exports = router;
