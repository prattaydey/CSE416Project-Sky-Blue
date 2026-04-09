const mongoose = require("mongoose");

const rosterItemSchema = new mongoose.Schema(
  {
    playerId: { type: String, default: null },
    playerName: { type: String, default: null },
    position: { type: String, default: null },
    amountPaid: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    draft: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Draft",
      required: true,
    },
    budgetRemaining: {
      type: Number,
      required: true,
      min: 0,
    },
    roster: {
      type: [rosterItemSchema],
      default: [],
    },
  },
  { timestamps: true, versionKey: false }
);

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
