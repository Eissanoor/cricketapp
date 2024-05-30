const mongoose = require("mongoose");

const PointsTableSchema = new mongoose.Schema({
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  },
  semiQualifier: { type: Boolean },
  finalQualifier: { type: Boolean },
  group: {
    type: mongoose.Schema.Types.ObjectId,
  },
  groupName: String,
  matchesPlayed: {
    type: Number,
    default: 0,
  },
  wins: {
    type: Number,
    default: 0,
  },
  losses: {
    type: Number,
    default: 0,
  },
  draws: {
    type: Number,
    default: 0,
  },
  points: {
    type: Number,
    default: 0,
  },
  netRunRate: {
    type: Number,
    default: 0,
  },
  runsScored: {
    type: Number,
    default: 0,
  },
  runsAgainst: {
    type: Number,
    default: 0,
  },
  oversFaced: {
    type: Number,
    default: 0,
  },
});

PointsTableSchema.methods.calculateNRR = function () {
  if (this.oversFaced > 0) {
    this.netRunRate = (this.runsScored - this.runsAgainst) / this.oversFaced;
  } else {
    this.netRunRate = 0;
  }
};

module.exports = mongoose.model("PointsTable", PointsTableSchema);
