const mongoose = require("mongoose");

const tournamentSchema = new mongoose.Schema({
  seriesName: {
    type: String,
    required: true,
  },
  seriesLocation: {
    type: String,
    required: true,
  },
  tournamentType: {
    type: String,
    required: true,
  },
  numberOfOvers: {
    type: Number,
    required: true,
  },
  numberOfTeams: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  teams: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team", // Reference to the Team model
    },
  ],
});

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
