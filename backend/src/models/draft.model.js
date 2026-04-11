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
  },
  { timestamps: true, versionKey: false }
);

const Draft = mongoose.model("Draft", draftSchema);

module.exports = Draft;
