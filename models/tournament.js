const mongoose = require("mongoose");

const matchTypes = ["series", "qualifier", "semiFinal", "final"];

const tournamentSchema = new mongoose.Schema({
  admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "admin" }],
  image: { type: String, required: true },
  seriesName: { type: String, required: true },
  seriesLocation: { type: String, required: true },
  tournamentType: { type: String, required: true },
  numberOfOvers: { type: Number, required: true },
  numberOfTeams: { type: Number, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  teams: [
    {
      team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
      qualified: { type: Boolean },
      eliminated: { type: Boolean },
    },
  ],
  semiFinalTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  finalTeams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
  groups: [
    {
      name: String,
      //   teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
      teams: [
        {
          team: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
          qualified: { type: Boolean },
          eliminated: { type: Boolean },
        },
      ],
      pointsTable: [
        { type: mongoose.Schema.Types.ObjectId, ref: "PointsTable" },
      ],
      totalMatches: Number,
      qualifiersNumber: Number,
    },
  ],

  winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
});

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
