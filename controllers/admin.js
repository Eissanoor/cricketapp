const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Player = require("../models/player");

const scorerHelper = require("../utils/scorer");

exports.postSetOpenings = async (req, res, next, socketIo) => {
  try {
    const { matchId, teamBatting, openingBatsmen, openingBowler } = req.body;

    let match = await MatchDetails.findById(matchId);
    if (!match) return next(new Error("Couldn't find match"));

    match.striker = openingBatsmen[0];
    match.nonStriker = openingBatsmen[1];
    match.openingBowler = openingBowler;

    await scorerHelper.setPlayersInnings(match.striker, matchId);
    await scorerHelper.setPlayersInnings(match.nonStriker, matchId);

    const team = match.team1Batting ? match.team2 : match.team1;
    await Player.findById(match.striker).setLatestPerformance(matchId, team);
    await Player.findById(match.nonStriker).setLatestPerformance(matchId, team);

    if (match.currentInning.number == 2 && !match.currentInning.started) {
      match.currentInning.started = true;
      match = await match.save();
    }

    let scorecard = await ScoreCard.findOne({
      match: match._id,
      innings: match.currentInning.number,
    });

    if (!scorecard) {
      scorecard = new ScoreCard({
        match: match._id,
        battingTeam: teamBatting === match.team1 ? match.team1 : match.team2,
        bowlingTeam: teamBatting === match.team1 ? match.team2 : match.team1,
        batsmen: [{ player: openingBatsmen[0] }],
        bowlers: [{ player: openingBowler }],
        innings: match.currentInning.number,
      });
      await scorecard.save();
      match.scorecard.push(scorecard);
    }

    const matchstart = await match.save();
    socketIo.emit("match-" + matchId, matchstart);

    res.status(200).json({
      success: true,
      message: "Opening batsmen and bowler set successfully.",
      status: 200,
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.setManOfTheMatch = async (req, res, next) => {
  try {
    const { matchId, playerId } = req.body;
    let match = await MatchDetails.findById(matchId);

    if (!match)
      return next(new Error("Could not find match details for " + matchId));

    match.manOfTheMatch = playerId;
    const updatedMatch = await match.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Man of the match saved successfully",
      data: null,
    });

    return updatedMatch;
  } catch (error) {
    error.message =
      "An error occurred while saving the match, please try again";
    next(error);
  }
};
