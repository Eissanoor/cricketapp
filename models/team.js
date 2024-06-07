const mongoose = require("mongoose");

const { cloudinary } = require("../config/cloudinary");

const teamSchema = new mongoose.Schema(
  {
    name: String,
    location: String,
    image: {
      required: true,
      type: String,
    },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "admin" }],
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    public_id: {
      type: String,
      required: false,
    },
    recentPerformance: [
      {
        team: { type: mongoose.Schema.Types.ObjectId },
        history: [
          {
            wins: Boolean,
            wonByRuns: Number,
            match: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "MatchDetails",
            },
          },
        ],
      },
    ],
  },
  {
    timestamps: true,
  }
);

teamSchema.statics.deleteAllTeamsByAdmin = async function (adminId) {
  const teams = await this.find({ admins: adminId });

  for (let team of teams) {
    // If the team has an image, delete it from Cloudinary
    if (team.public_id) {
      await cloudinary.uploader.destroy(team.public_id, {
        resource_type: "image",
      });
    }
  }

  await this.deleteMany({ admins: adminId });
};

const Team = mongoose.model("Team", teamSchema);

module.exports = Team;
