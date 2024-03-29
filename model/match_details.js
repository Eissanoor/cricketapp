const mongoose = require("mongoose");

const matchDetailsSchema = new mongoose.Schema({
  team1: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  team2: { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
  matchType: { type: String, required: true },
  ballType: { type: String, required: true },
  pitchType: { type: String, required: true },
  numberOfOvers: { type: Number, required: true },
  oversPerBowler: { type: Number, required: true },
  cityOrTown: { type: String, required: true },
  ground: { type: String, required: true },
  matchDateTime: { type: Date, required: true },
  whoWinsTheToss: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
    required: true,
  },
  tossDetails: { type: String, required: true },
  matchStatus: { type: String, required: true },
  team1Score: Number,
  team2Score: Number,
  team1Overs: Number,
  team1Balls: Number,
  team2Overs: Number,
  team2Balls: Number,
  squad1: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
  ],
  squad2: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Player", required: true },
  ],
});

const MatchDetails = mongoose.model("MatchDetails", matchDetailsSchema);

module.exports = MatchDetails;
