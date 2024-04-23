const MatchDetails = require("../model/match_details");

exports.getLiveMatches = async (req, res) => {
  try {
    const matches = await MatchDetails.find({ matchStatus: 1 }).populate(
      "team1 team2 squad1 squad2 openingBowler striker nonStriker currentOver.balls overs.balls playerStats.player",
      "name image Image runsScored isExtra"
    );

    if (!matches || matches.length === 0) {
      return next(new Error("No matches found"));
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Match details",
      data: matches,
    });
  } catch (error) {
    error.message = "Internal server error";
    next(error);
  }
};

exports.getUpcomingMathces = async (req, res) => {
  try {
    const matches = await MatchDetails.find({ matchStatus: 0 }).populate(
      "team1 team2 squad1 squad2",
      "name image Image"
    );

    if (!matches || matches.length === 0) {
      return next(new Error("No matches found"));
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Match details",
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};
