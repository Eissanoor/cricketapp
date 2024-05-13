const mongoose = require("mongoose");

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
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Team" }],
});

const Tournament = mongoose.model("Tournament", tournamentSchema);

module.exports = Tournament;
