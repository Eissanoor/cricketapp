const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Player = require("../models/player");
const Over = require("../models/over");
const Tournament = require("../models/tournament");
const PointsTable = require("../models/points_table");

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
      .sort({ matchDate: -1 }) // sort by matchDate in descending order
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
      .sort({ _id: -1 })
      .select(
        "-striker -nonStriker -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
      )
      .populate("team1 team2 squad1 squad2 manOfTheMatch", "name image Image")
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");
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
    let matches;

    // Find the matches with the given matchStatus
    if (matchStatus == 1) {
      matches = await MatchDetails.find({ matchStatus: matchStatus })
        .sort({ _id: -1 })
        .limit(10)
        .select(
          "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
        )
        .populate("team1 team2", "name image")
        .populate("squad1 squad2", "name")
        .populate("tournamentInfo.tournament", "seriesName seriesLocation");
    } else if (matchStatus == 0) {
      matches = await MatchDetails.find({ matchStatus: matchStatus })
        .sort({ _id: -1 })
        .limit(10)
        .populate(
          "team1 team2 squad1 squad2",
          "name image Image recentPerformance"
        )
        .populate("tournamentInfo.tournament", "seriesName seriesLocation");
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Banner matches received successfully",
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

// * TOURNAMENT ***
exports.getLastFiveTournaments = async (req, res, next) => {
  try {
    // Find the last 5 tournaments
    const tournaments = await Tournament.find({
      $or: [{ winner: { $exists: false } }, { winner: null }],
    })
      .sort({ _id: -1 })
      .limit(5)
      .select("-teams -groups -winner");

    if (!tournaments || tournaments.length < 1) {
      const error = new Error("Tournament not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      data: tournaments,
      message: "Tournaments are now available",
    });
  } catch (error) {
    next(error);
  }
};

// * Points Table ***
exports.getTournamentPointsTable = async (req, res, next) => {
  try {
    const tournament = req.params.id;
    const group = req.query.group;

    let pointsTables;
    if (group != null || group != undefined) {
      pointsTables = await PointsTable.find({
        tournament: tournament,
        group: group.toString(),
      })
        .sort({ netRunRate: -1 })
        .populate("team", "name");
    } else {
      pointsTables = await PointsTable.find({ tournament: tournament })
        .sort({ netRunRate: -1 })
        .populate("team", "name");
    }

    if (!pointsTables || pointsTables.length === 0) {
      const error = new Error("No points found for tournament");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Points found for tournament",
      data: pointsTables,
    });
  } catch (err) {
    next(err);
  }
};
