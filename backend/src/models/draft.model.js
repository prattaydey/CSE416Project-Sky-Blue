const mongoose = require("mongoose");

const rosterSlotSchema = new mongoose.Schema(
  {
    position: { type: String, required: true, trim: true },
    count: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const statCategoriesSchema = new mongoose.Schema(
  {
    hitters: { type: [String], default: [] },
    pitchers: { type: [String], default: [] },
  },
  { _id: false }
);

const pickHistorySchema = new mongoose.Schema(
  {
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    position: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    nominatorTeamId: { type: mongoose.Schema.Types.ObjectId, ref: "Team", default: null },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const draftSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["AL", "NL", "Both"],
    },
    numberOfTeams: {
      type: Number,
      required: true,
      min: 1,
    },
    budgetPerTeam: {
      type: Number,
      required: true,
      min: 0,
    },
    rosterSlots: {
      type: [rosterSlotSchema],
      required: true,
      default: [],
    },
    statCategories: {
      type: statCategoriesSchema,
      required: true,
      default: () => ({ hitters: [], pitchers: [] }),
    },
    pickHistory: {
      type: [pickHistorySchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

const Draft = mongoose.model("Draft", draftSchema);

module.exports = Draft;
