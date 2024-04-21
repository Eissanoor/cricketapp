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
  ballTo: { type: String, required: true },
  description: { type: String, required: true },
  runsScored: { type: Number, required: true },
  isExtra: { type: Boolean, default: false },
  extraType: { type: String },
  isWicket: { type: Boolean, default: false },
  wicketType: { type: String },
  fielder: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
});

const Ball = mongoose.model("Ball", ballSchema);

module.exports = Ball;
