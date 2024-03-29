const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: String,
  location: String,
  role: String,
  age: String,
  Image: String,
  additionalInfo: String,
  admins: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "admin", // Reference to the Admin model
    },
  ],
  stats: {
    sixes: { type: Number, default: 0 },
    fours: { type: Number, default: 0 },
    wickets: { type: Number, default: 0 },
    catches: { type: Number, default: 0 },
    runs: { type: Number, default: 0 },
    balls: { type: Number, default: 0 },
    fifties: { type: Number, default: 0 },
    hundreds: { type: Number, default: 0 },

    // Add other fields as needed
  },
});

const Player = mongoose.model("Player", playerSchema);

module.exports = Player;
