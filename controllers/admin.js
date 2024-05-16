const mongoose = require("mongoose");

const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Tournament = require("../models/tournament");

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
    await scorerHelper.addLatestPerformance(match.striker, matchId, team);
    await scorerHelper.addLatestPerformance(match.nonStriker, matchId, team);

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

exports.postTournament = async (req, res, next, cloudinary) => {
  try {
    const {
      admins,
      seriesName,
      seriesLocation,
      tournamentType,
      numberOfOvers,
      numberOfTeams,
      startDate,
      endDate,
    } = req.body;

    const adminIds = Array.isArray(admins)
      ? admins.map((id) => mongoose.Types.ObjectId(id))
      : [];

    let imageFile = null;
    const file = req.file;
    if (file) {
      imageFile = `data:image/png;base64,${file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(imageFile);
      imageFile = result.url;
    }

    const tournament = new Tournament({
      image: imageFile,
      admins: adminIds,
      seriesName: seriesName,
      seriesLocation: seriesLocation,
      tournamentType: tournamentType,
      numberOfOvers: numberOfOvers,
      numberOfTeams: numberOfTeams,
      startDate: startDate,
      endDate: endDate,
    });
    const result = await tournament.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Tournament saved successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTournaments = async (req, res, next) => {
  try {
    const adminId = req.query.adminId;
    let tournaments;
    if (adminId) {
      tournaments = await Tournament.find({ admins: adminId }).select("-teams");
    } else {
      tournaments = await Tournament.find().select("-teams");
    }
    if (tournaments.length < 1)
      return next(new Error("No tournament found for the admin"));
    if (!tournaments) return next(new Error("No tournament found"));
    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament found successfully",
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId).populate(
      "teams"
    );
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }
    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament found successfully",
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

exports.putTournamentAccess = async (req, res, next) => {
  try {
    const { tournamentId, adminId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }
    if (!tournament.admins.includes(adminId)) {
      tournament.admins.push(adminId);
      await tournament.save();
    } else {
      const error = new Error("Admin already has access to this tournament");
      error.statusCode = 404;
      return next(error);
    }
    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament access shared successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.putTeamToTournament = async (req, res, next) => {
  try {
    const { tournamentId, teamId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }
    if (!tournament.teams.includes(teamId)) {
      tournament.teams.push(teamId);
      await tournament.save();
    }
    res.status(200).json({
      status: 200,
      success: true,
      message: "Team added to tournament successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
