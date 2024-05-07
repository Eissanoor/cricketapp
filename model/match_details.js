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
    winningTeam: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
    tossDetails: { type: String },
    matchStatus: { type: Number, required: true },
    team1Batting: { type: Boolean },
    team2Batting: { type: Boolean },
    team1toss: { type: Boolean },
    team2toss: { type: Boolean },
    draw: { type: Boolean },
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
    currentInning: {
      number: { type: Number, default: 1 },
      started: { type: Boolean, default: true },
    },
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
    lastWicket: {
      player: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
      runs: { type: Number, default: 0 },
      ballsFaced: { type: Number, default: 0 },
      fours: { type: Number, default: 0 },
      sixes: { type: Number, default: 0 },
      strikeRate: { type: Number, default: 0 },

      // Add other player statistics as needed
    },
    partnership: {
      runs: { type: Number, default: 0 },
      balls: { type: Number, default: 0 },
    },
    team1CurrentRunRate: { type: Number, default: 0 },
    team2CurrentRunRate: { type: Number, default: 0 },
    team1RequiredRunRate: { type: Number, default: 0 },
    team2RequiredRunRate: { type: Number, default: 0 },
    matchStopped: {
      stop: { type: Boolean, default: false },
      stopReason: String,
    },
    // Other fields related to match statistics
  },
  {
    timestamps: true,
  }
);

matchDetailsSchema.methods.isInningFinished = function () {
  if (this.currentInning.number == 1) {
    const wicketsFinished = this.team1Batting
      ? this.team1Outs >= this.squad1.length - 1
      : this.team2Outs >= this.squad2.length - 1;
    if (this.currentOver.number >= this.numberOfOvers || wicketsFinished) {
      return true;
    }
  }
  return false;
};
matchDetailsSchema.methods.finishInning = function () {
  // change batting and bowling
  this.team1Batting = !this.team1Batting;
  this.team2Batting = !this.team2Batting;
  // reset some variables
  this.currentOver.number = 0;
  this.currentOver.balls = [];
  this.partnership.runs = 0;
  this.partnership.balls = 0;
  // update the number of inning to 2, indicating 2nd innings
  this.currentInning.number = 2;
  this.currentInning.started = false;
  return this;
};
matchDetailsSchema.methods.isMatchFinished = function () {
  if (this.currentInning.number >= 2) {
    console.log("match inning is 2");
    const oversCompleted = this.currentOver.number >= this.numberOfOvers;
    const runsChased = this.team1Batting
      ? this.team1Score > this.team2Score
      : this.team2Score > this.team1Score;
    const wicketsFinished = this.team1Batting
      ? this.team1Outs >= this.squad1.length - 1
      : this.team2Outs >= this.squad2.length - 1;

    if (oversCompleted || runsChased || wicketsFinished) {
      console.log("true");
      return true;
    }
  }
  console.log("false");

  return false;
};
matchDetailsSchema.methods.finishMatch = function () {
  // change the Match status to 2 indicating the end of the this
  this.matchStatus = 2;
  // update the winning team
  if (this.team1Score > this.team2Score) {
    this.winningTeam = this.team1;
  } else if (this.team2Score > this.team1Score) {
    this.winningTeam = this.team2;
  } else {
    this.draw = true;
  }
  return this;
};
matchDetailsSchema.methods.stopMatch = function (reason) {
  this.matchStopped.stop = true;
  this.matchStopped.stopReason = reason;
};
matchDetailsSchema.methods.resumeMatch = function () {
  this.matchStopped.stop = false;
  this.matchStopped.stopReason = null;
};

const MatchDetails = mongoose.model("MatchDetails", matchDetailsSchema);

module.exports = MatchDetails;
