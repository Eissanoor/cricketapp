const mongoose = require("mongoose");

const ballSchema = new mongoose.Schema({
  match: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MatchDetails",
    required: true,
  },
  bowler: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  batsman: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
    required: true,
  },
  runsScored: { type: Number, required: true },
  isExtra: { type: Boolean, default: false }, // Whether the run was an extra (e.g., wide, no-ball)
  extraType: { type: String }, // Type of extra (e.g., wide, no-ball)
  isWicket: { type: Boolean, default: false },
  wicketType: { type: String }, // Type of wicket (e.g., caught, bowled)
  fielder: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Player who took the catch or performed the run-out
});

const Ball = mongoose.model("Ball", ballSchema);

module.exports = Ball;
