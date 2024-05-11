const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: String,
  location: String,
  role: String,
  age: String,
  Image: String,
  additionalInfo: String,
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin", // Reference to the Admin model
    },
  ],
  t20Stats: {
    sixes: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    // Add other T20-specific fields as needed
  },
  odiStats: {
    sixes: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    // Add other ODI-specific fields as needed
  },
  stats: {
    sixes: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },
    innings: { type: Number, default: 0 },
    highestScore: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    strikeRate: { type: Number, default: 0 },
    // Add other fields for last performance as needed
  },
  latestPerformance: [
    {
      team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      runs: { type: Number, default: 0 },
      match: { type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" },
    },
  ],
});

playerSchema.methods.setInnings = async function (format) {
  if (format === "t20") {
    this.t20Stats.innings += 1;
  } else if (format === "odi") {
    this.odiStats.innings += 1;
  }
  await this.save();
};

playerSchema.methods.addLatestPerformance = async function (matchId, team) {
  // Create a new performance object
  const newPerformance = { matchId, team };

  // If the latestPerformance array has reached its max size, remove the last element
  if (this.latestPerformance.length >= 5) {
    this.latestPerformance.pop();
  }

  // Add the new performance at the beginning of the array
  this.latestPerformance.unshift(newPerformance);

  // Mark the latestPerformance array as modified
  this.markModified("latestPerformance");

  // Save the changes to the database
  await this.save();
};

playerSchema.methods.updateLatestPerformanceScore = async function (
  matchId,
  runs
) {
  console.log(matchId, runs);
  const performanceIndex = this.latestPerformance.findIndex(
    (p) => p.match === matchId
  );

  console.log(performanceIndex);

  if (performanceIndex != -1) {
    this.latestPerformance[performanceIndex].runs += runs;
    this.markModified("latestPerformance");
  }
  console.log(this.latestPerformance);
  await this.save();
};

const Player = mongoose.model("Player", playerSchema);

module.exports = Player;
