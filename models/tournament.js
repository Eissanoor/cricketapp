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
  qualifiers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
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
  qualifiedGroup: {
    name: { type: String, default: "qualified" },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
    pointsTable: [{ type: mongoose.Schema.Types.ObjectId, ref: "PointsTable" }],
    totalMatches: Number,
    qualifiersNumber: Number,
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: "Team" },
  //   matches: [
  //     {
  //       match: { type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" },
  //       matchType: { type: String, enum: matchTypes, required: true },
  //     },
  //   ],
  //   useGroups: { type: Boolean, required: true },
  //   groups: [
  //     {
  //       groupName: { type: String, required: true },
  //       matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" }],
  //     },
  //   ],
  //   matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" }],
  //   stages: {
  //     group: [{ type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" }],
  //     quarterFinals: [
  //       { type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" },
  //     ],
  //     semiFinals: [{ type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" }],
  //     finals: [{ type: mongoose.Schema.Types.ObjectId, ref: "MatchDetails" }],
  //   },
});

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
