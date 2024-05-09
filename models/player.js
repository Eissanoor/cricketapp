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
    // Add other ODI-specific fields as needed
  },
  lastPerformance: {
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
    // Add other fields for last performance as needed
  },
});

playerSchema.methods.setInnings = async function (format) {
  if (format === "t20") {
    this.t20Stats.innings += 1;
  } else if (format === "odi") {
    this.odiStats.innings += 1;
  } else {
    this.lastPerformance.innings += 1;
  }
  await this.save();
};

const Player = mongoose.model("Player", playerSchema);

module.exports = Player;
