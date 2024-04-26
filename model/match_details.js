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
    matchDateTime: { type: String, required: true },
    whoWinsTheToss: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    tossDetails: { type: String },
    matchStatus: { type: Number, required: true },
    team1Batting: { type: Boolean },
    team2Batting: { type: Boolean },
    team1toss: { type: Boolean },
    team2toss: { type: Boolean },
    manOfTheMatch: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    team1Score: { type: Number },
    team2Score: { type: Number },
    team1Overs: { type: Number },
    team2Overs: { type: Number },
    team1Balls: { type: Number },
    team2Balls: { type: Number },
    team1Outs: { type: Number },
    team2Outs: { type: Number },
    squad1: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    squad2: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    striker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    nonStriker: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    openingBowler: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    currentInning: { type: Number, default: 1 },
    innings: [
      {
        number: { type: Number, required: true },
        battingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        bowlingTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
        // Add other inning-related fields as needed
      },
    ],
    playerStats: [
      {
        player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        runs: { type: Number, default: 0 },
        ballsFaced: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
        strikeRate: { type: Number, default: 0 },
        // Add other player statistics as needed
      },
    ],
    bowlerStats: [
      {
        player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
        overs: { type: Number, default: 0 },
        maidens: { type: Number, default: 0 },
        runsGiven: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        economy: { type: Number, default: 0 },
        fours: { type: Number, default: 0 },
        sixes: { type: Number, default: 0 },
      },
    ],
    currentOver: {
      number: { type: Number, default: 0 },
      balls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ball" }],
    },
    overs: [
      {
        number: { type: Number, required: true },
        balls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ball" }],
      },
    ],
    scorecard: [{ type: mongoose.Schema.Types.ObjectId, ref: "ScoreCard" }],
    outPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    oversCompletedPlayers: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
    ],
    // Other fields related to match statistics
  },
  {
    timestamps: true,
  }
);

const MatchDetails = mongoose.model("MatchDetails", matchDetailsSchema);

module.exports = MatchDetails;
