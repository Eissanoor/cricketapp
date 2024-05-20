const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Player = require("../models/player");
const Over = require("../models/over");

exports.getLiveMatches = async (req, res, next) => {
  try {
    const matches = await MatchDetails.find({ matchStatus: 1 })
      .select(
        "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
      )
      .populate("team1 team2", "name image")
      .populate("squad1 squad2", "name")
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");
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
    const matches = await MatchDetails.find({ matchStatus: 0 })

      .populate(
        "team1 team2 squad1 squad2",
        "name image Image recentPerformance"
      )
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");

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

exports.getScoreCards = async (req, res, next) => {
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

exports.getMatchOvers = async (req, res, next) => {
  const { matchId } = req.params;
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  try {
    const overs = await Over.find({ match: matchId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate(
        "balls",
        "ballTo description runsScored isExtra isWicket extraType"
      );

    if (overs.length > 0) {
      return res.status(200).json({
        status: 200,
        success: true,
        message: "Overs for specific match",
        data: overs,
      });
    } else {
      const error = new Error("No overs found for the match");
      error.statusCode = 402;
      return next(error);
    }
  } catch (error) {
    return next(error);
  }
};

exports.getCompletedMatches = async (req, res, next) => {
  try {
    const matches = await MatchDetails.find({ matchStatus: 2 })
      .select(
        "-striker -nonStriker -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
      )
      .populate("team1 team2 squad1 squad2 manOfTheMatch", "name image Image");
    if (!matches || matches.length === 0) {
      return next(new Error("No matches found"));
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Completed matches found successfully",
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

exports.getBannerMatches = async (req, res, next) => {
  try {
    const { matchStatus } = req.query;

    // Find the matches with the given matchStatus
    const matches = await MatchDetails.find({ matchStatus: matchStatus })
      .sort({ _id: -1 })
      .limit(10)
      //   .select(
      //     "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
      //   )
      .populate(
        "team1 team2 squad1 squad2",
        "name image Image recentPerformance"
      )
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");

    res.status(200).json({
      status: 200,
      success: true,
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPlayerDetails = async function (req, res, next) {
  const id = req.params.playerId;

  try {
    const player = await Player.findById(id).populate(
      "latestPerformance.team",
      "name"
    );
    if (!player) {
      return next(new Error("Couldn't find a player"));
    }

    return res.status(200).json({
      status: 200,
      success: true,
      message: "Player details retrieved",
      data: player,
    });
  } catch (error) {
    next(error);
  }
};
