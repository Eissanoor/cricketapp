const MatchDetails = require("../model/match_details");
const ScoreCard = require("../model/score_card");
const Ball = require("../model/ball");

exports.getLiveMatches = async (req, res, next) => {
  try {
    const matches = await MatchDetails.find({ matchStatus: 1 })
      .populate(
        "team1 team2 squad1 squad2 openingBowler striker nonStriker currentOver.balls overs.balls playerStats.player bowlerStats.player",
        "name image Image runsScored isExtra"
      )
      .populate("lastWicket.player", "name -_id");
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

exports.getUpcomingMathces = async (req, res, next) => {
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

exports.getScoreCardsByMatchId = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const scorecards = await ScoreCard.find({ match: matchId })
      .populate("battingTeam bowlingTeam", "name image -_id")
      .populate("batsmen.player bowlers.player", "name Image")
      .populate(
        "batsmen.dismissal.outBy batsmen.dismissal.fielder",
        "name Image"
      );
    if (scorecards.length <= 0) {
      return next(new Error("No scorecards found for current match"));
    }
    res.status(200).json({
      status: 200,
      success: true,
      message: "Scorecards retrieved",
      data: scorecards,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMatchBalls = async (req, res, next) => {
  const matchId = req.params.matchId;
  const balls = await Ball.find({ match: matchId }).sort({ createdAt: -1 });

  if (balls.length > 0) {
    res.json(balls);
  } else {
    next(new Error("No balls found for the match"));
  }
};
