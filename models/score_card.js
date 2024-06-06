const mongoose = require("mongoose");

const scoreCardSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchDetails",
      required: true,
    },
    innings: {
      type: Number,
      required: true,
    },
    battingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    bowlingTeam: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    batsmen: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
          required: true,
        },
        runs: {
          type: Number,
          default: 0,
        },
        ballsFaced: {
          type: Number,
          default: 0,
        },
        fours: {
          type: Number,
          default: 0,
        },
        sixes: {
          type: Number,
          default: 0,
        },
        strikeRate: {
          type: Number,
          default: 0,
        },
        // Add field for dismissal details
        dismissal: {
          type: {
            type: String,
            enum: [
              "Bowled",
              "Caught",
              "LBW",
              "Run Out",
              "Stumped",
              "Hit Wicket",
              "Handled Ball",
              "Obstructing Field",
              "Timed Out",
              "Hit Twice",
              "Not Out",
            ],
            default: "Not Out",
          },
          outBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
          },
          fielder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Player",
          },
        },
      },
    ],
    bowlers: [
      {
        player: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Player",
          required: true,
        },
        overs: {
          type: Number,
          default: 0,
        },
        maidens: {
          type: Number,
          default: 0,
        },
        runsGiven: {
          type: Number,
          default: 0,
        },
        wickets: {
          type: Number,
          default: 0,
        },
        economy: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const ScoreCard = mongoose.model("ScoreCard", scoreCardSchema);

module.exports = ScoreCard;
