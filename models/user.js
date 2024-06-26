const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
  },
  fcmToken: {
    type: String,
    required: true,
  },
  lastViewed: { type: Date, default: Date.now },
  // Other user fields can go here
});

module.exports = mongoose.model("User", userSchema);
