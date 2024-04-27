const mongoose = require("mongoose");

const overSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MatchDetails",
      required: true,
    },
    over: {
      number: { type: Number, required: true },
      balls: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ball" }],
    },
  },
  {
    timestamps: true,
  }
);

const Over = mongoose.model("Over", overSchema);

module.exports = Over;
