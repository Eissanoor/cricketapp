const mongoose = require("mongoose");

const matchDetailsSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin",
      required: true,
    },
    team1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    team2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    matchType: { type: String, required: true },
    ballType: { type: String, required: true },
    pitchType: { type: String, required: true },
    numberOfOvers: { type: Number, required: true },
    oversPerBowler: { type: Number, required: true },
    cityOrTown: { type: String, required: true },
    ground: { type: String, required: true },
    matchDateTime: { type: Date, required: true },
    whoWinsTheToss: { type: mongoose.Schema.Types.ObjectId, ref: "Team" }, // Nullable
    tossDetails: { type: String },
    matchStatus: { type: Number, required: true },
    team1Batting: { type: Boolean }, // Nullable
    team2Batting: { type: Boolean }, // Nullable
    team1toss: { type: Boolean }, // Nullable
    team2toss: { type: Boolean }, // Nullable
    manOfTheMatch: { type: mongoose.Schema.Types.ObjectId, ref: "Player" }, // Nullable
    team1Score: { type: Number }, // Nullable
    team2Score: { type: Number }, // Nullable
    team1Overs: { type: Number }, // Nullable
    team2Overs: { type: Number }, // Nullable
    team1Balls: { type: Number }, // Nullable
    team2Balls: { type: Number }, // Nullable
    team1Outs: { type: Number }, // Nullable
    team2Outs: { type: Number }, // Nullable
    squad1: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }], // Nullable
    squad2: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }], // Nullable
  },
  {
    timestamps: true,
  }
);

const MatchDetails = mongoose.model("MatchDetails", matchDetailsSchema);

module.exports = MatchDetails;
