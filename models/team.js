const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: String,
  location: String,
  image: {
    required: true,
    type: String,
  },
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "admin" }],
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
  recentPerformance: [
    {
      team: { type: mongoose.Schema.Types.ObjectId },
      history: [
        {
          wins: Boolean,
          wonByRuns: Number,
          match: { type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" },
        },
      ],
    },
  ],
});

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
