const mongoose = require("mongoose");

const SocialLinkSchema = new mongoose.Schema(
  {
    mediaType: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SocialLink", SocialLinkSchema);
