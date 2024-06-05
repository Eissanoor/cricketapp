const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    videoUrl: {
      type: String,
      required: true,
    },
    // thumbnail: {
    //   type: String,
    //   required: true,
    // },
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "admin",
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Video = mongoose.model("Video", videoSchema);

module.exports = Video;
