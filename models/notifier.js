const mongoose = require("mongoose");

const notifierSchema = new mongoose.Schema({
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "admin",
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Team",
  },
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Player",
  },
  tournament: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tournament",
  },
  type: {
    type: String,
    enum: ["team", "player", "tournament"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Notifier = mongoose.model("Notifier", notifierSchema);

module.exports = Notifier;
