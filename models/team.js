const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  name: String,
  location: String,
  image: {
    required: true,
    type: String,
  },
  admin: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin", // Reference to the Admin model
    },
  ],
  players: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Player", // Reference to the Player model
    },
  ],
});

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
