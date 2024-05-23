const mongoose = require("mongoose");

const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Tournament = require("../models/tournament");
const Notifier = require("../models/notifier");
const Team = require("../models/team");
const Player = require("../models/player");
const Admin = require("../models/admin");
const PointsTable = require("../models/points_table");

const scorerHelper = require("../utils/scorer");

// * ADMIN ************************************************
exports.putAccess = async (req, res, next) => {
  try {
    const { adminId, id, type } = req.body;
    const existingNotifier = await Notifier.findOne({
      admin: adminId,
      [type]: id,
    });
    if (existingNotifier) {
      const error = new Error(
        `You have already invited this admin for this ${type}`
      );
      error.statusCode = 409;
      return next(error);
    }
    const notifier = new Notifier({
      admin: adminId,
      [type]: id,
      type,
    });
    await notifier.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: `Admin invited to ${type} successfully`,
      data: notifier,
    });
  } catch (error) {
    next(error);
  }
};

exports.invitationResponse = async (req, res, next) => {
  try {
    const { adminId, id, accept, type } = req.body;
    const notifier = await Notifier.findOne({
      admin: adminId,
      [type]: id,
    });
    if (!notifier) {
      const error = new Error("No invitation found");
      error.statusCode = 404;
      return next(error);
    }
    if (accept) {
      const entity = await mongoose
        .model(type.charAt(0).toUpperCase() + type.slice(1))
        .findById(id);
      if (!entity) {
        const error = new Error(`No ${type} found`);
        error.statusCode = 404;
        return next(error);
      }
      if (!entity.admins.includes(adminId)) {
        entity.admins.push(adminId);
        await entity.save();
      }
    }
    await Notifier.findByIdAndRemove(notifier._id);
    res.status(200).json({
      status: 200,
      success: true,
      message: accept
        ? `Admin added to ${type} successfully`
        : "Invitation rejected successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.getAdminInvitations = async (req, res, next) => {
  try {
    const { adminId } = req.params;
    const invitations = await Notifier.find({ admin: adminId })
      .populate("tournament", "seriesName image")
      .populate("player", "name Image")
      .populate("team", "name image");
    res.status(200).json({
      status: 200,
      success: true,
      message: "Invitations retrieved successfully",
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

exports.getOtherAdmins = async (req, res, next) => {
  try {
    const adminID = req.body.adminID;
    const page = parseInt(req.body.page) || 1; // Current page number, default is 1
    const limit = parseInt(req.body.limit) || 10; // Number of documents per page, default is 10
    const search = req.body.search || null; // Search string, default is null

    // Calculate the number of documents to skip based on the page and limit
    const skip = (page - 1) * limit;

    let query = { _id: { $ne: adminID } };

    // If search is provided and not null, add it to the query
    if (search !== null) {
      query = {
        ...query,
        fullname: { $regex: search, $options: "i" }, // Case-insensitive partial match for name
      };
    }

    // Find all admin except the one with the provided adminID, with pagination and search
    const data = await Admin.find(query).skip(skip).limit(limit);

    // If no data found, return an empty array instead of null
    if (!data || data.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No other admins found",
        data: [],
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Other admin details",
      data: data,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// * TEAM ***
exports.postAddTeam = async (req, res, next, cloudinary) => {
  try {
    const { name, location, admins, players } = req.body;
    const playerID = Array.isArray(players)
      ? players.map((id) => mongoose.Types.ObjectId(id))
      : [];

    const adminIDs = Array.isArray(admins)
      ? admins.map((id) => mongoose.Types.ObjectId(id))
      : [];
    let ManuImage = null;

    const file = req.file;
    if (file) {
      ManuImage = `data:image/png;base64,${file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    }
    const team = new Team({
      name: name,
      location: location,
      admins: adminIDs,
      players: playerID,
      image: ManuImage,
    });
    const savedTeam = await team.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Team has been added successfully",
      data: savedTeam,
    });
  } catch (error) {
    next(error);
  }
};

exports.getTeams = async (req, res, next) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "Required parameter 'adminId' is missing",
        data: null,
      });
    }

    // Find teams where admin matches adminId
    const teams = await Team.find({ admins: adminId })
      .populate("players", "-latestPerformance")
      .populate("admins");

    if (!teams || teams.length === 0) {
      const error = new Error("No teams found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Teams fetched successfully",
      data: teams,
    });
  } catch (error) {
    next(error);
  }
};

exports.putUpdateTeam = async (req, res, next, cloudinary) => {
  try {
    const teamID = req.body.teamID;
    const { name, location } = req.body;
    const team = await Team.findById({ _id: teamID });

    if (!team) {
      const error = new Error("Team not found");
      error.statusCode = 404;
      return next(error);
    }

    // let ManuImage = null;
    // if (req.file) {
    //   ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
    //   const result = await cloudinary.uploader.upload(ManuImage);
    //   ManuImage = result.url;
    // } else {
    //   ManuImage = team.image;
    // }

    let ManuImage = null;
    if (req.file) {
      // If there's a previous image, delete it
      if (team.image) {
        const publicId = team.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    } else {
      ManuImage = team.image;
    }

    team.name = name;
    team.location = location;
    team.image = ManuImage;
    const updatedProduct = await team.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: "Team updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTeam = async (req, res, next, cloudinary) => {
  try {
    const teamID = req.body.teamID;
    const deletedPlayer = await Team.findByIdAndDelete({ _id: teamID });

    if (!deletedPlayer) {
      const error = new Error(`Team ${teamID} is not deleted`);
      error.statusCode = 404;
      return next(error);
    }

    const image = deletedPlayer.image;

    if (image) {
      const parts = image.split("/");

      // Get the last part of the split array
      const lastPart = parts[parts.length - 1];

      // Split the last part by '.'
      const publicId = lastPart.split(".")[0];

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
      console.log(result);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "team deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.putPlayerToTeam = async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const adminId = req.body.adminId;
    const newPlayers = req.body.newPlayers;

    const checkAdmin = await Admin.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "This admin is either not found or blocked",
        data: null,
      });
    }

    const team = await Team.findOne({ _id: teamID, admins: adminId });

    if (!team) {
      const error = new Error("Team not found");
      error.status = 404;
      return next(error);
    }

    if (Array.isArray(newPlayers) && newPlayers.length > 0) {
      for (const newPlayerId of newPlayers) {
        if (!team.players.includes(newPlayerId)) {
          team.players.push(newPlayerId);
        } else {
          return res.status(400).json({
            status: 400,
            success: false,
            message: `Player with ID ${newPlayerId} already exists in the team`,
            data: null,
          });
        }
      }
    }

    const updatedTeam = await team.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Team details updated with new players",
      data: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

exports.putShareTeam = async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const adminId = req.body.adminId;
    const newAdmins = req.body.newAdmins;

    // Check if the requesting admin is not blocked
    const checkAdmin = await Admin.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "This admin is either not found or blocked",
        data: null,
      });
    }

    const team = await Team.findOne({ _id: teamID, admins: adminId });

    if (!team) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Team not found for this Team ID",
        data: null,
      });
    }

    if (Array.isArray(newAdmins) && newAdmins.length > 0) {
      for (const newAdminId of newAdmins) {
        if (!team.admins.includes(newAdminId)) {
          team.admins.push(newAdminId);
        } else {
          return res.status(400).json({
            status: 400,
            success: false,
            message: `Admin with ID ${newAdminId} already exists in the team`,
            data: null,
          });
        }
      }
    }

    // Save the updated team with new admins added
    const updatedTeam = await team.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Team details updated with new admins",
      data: updatedTeam,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
};

exports.getTeamPlayers = async (req, res, next) => {
  try {
    const teamID = req.params.teamID;
    const teams = await Team.find({ _id: teamID }).populate(
      "players",
      "name location role Image"
    );

    if (!teams || teams.length === 0) {
      const error = new Error("No teams found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Team details",
      data: teams[0].players,
    });
  } catch (error) {
    next(error);
  }
};

// * PLAYER ***
exports.postAddPlayer = async (req, res, next, cloudinary) => {
  try {
    const {
      name,
      location,
      role,
      age,
      additionalInfo,
      admins,
      sixes,
      fours,
      wickets,
    } = req.body;
    const adminObjectIds = Array.isArray(admins)
      ? admins.map((id) => mongoose.Types.ObjectId(id))
      : [];
    let ManuImage = null;

    const file = req.file;
    if (file) {
      ManuImage = `data:image/png;base64,${file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    }

    const player = new Player({
      name: name,
      location: location,
      role: role,
      age: age,
      additionalInfo: additionalInfo,
      admins: adminObjectIds,
      stats: {
        sixes: sixes,
        fours: fours,
        wickets: wickets,
      },
      Image: ManuImage,
    });
    const savedPlayer = await player.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Player has been added successfully",
      data: savedPlayer,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.playerDetailsByAdminId = async (req, res, next) => {
  try {
    const adminId = req.params.admin;
    const players = await Player.find({ admins: adminId }).select(
      "-latestPerformance"
    );

    if (!players) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found for this admin ID",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player details",
      data: players,
    });
  } catch (error) {
    next(error);
  }
};

exports.playerDetailsByPlayerId = async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const data = await Player.findOne({ _id: playerId });

    if (!data) {
      const error = new Error("Player not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player details",
      data: data,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.deletePlayer = async (req, res, next, cloudinary) => {
  try {
    const playerId = req.body.playerId;
    const deletedPlayer = await Player.findByIdAndDelete(playerId);

    if (!deletedPlayer) {
      const error = new Error("Player not found");
      error.statusCode = 404;
      return next(error);
    }

    const image = deletedPlayer.Image;

    if (image) {
      const parts = image.split("/");

      // Get the last part of the split array
      const lastPart = parts[parts.length - 1];

      // Split the last part by '.'
      const publicId = lastPart.split(".")[0];

      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.updatePlayer = async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const { name, location, role, age, additionalInfo, admins } = req.body;

    const player = await Player.findById(playerId);
    if (!player) {
      const error = new Error("Player not found");
      error.statusCode = 404;
      return next(error);
    }

    // let ManuImage = null;
    // if (req.file) {
    //   ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
    //   const result = await cloudinary.uploader.upload(ManuImage);
    //   ManuImage = result.url;
    // } else {
    //   ManuImage = player.Image;
    // }

    let ManuImage = null;
    if (req.file) {
      // If there's a previous image, delete it
      if (player.Image) {
        const publicId = player.Image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    } else {
      ManuImage = player.Image;
    }

    player.name = name;
    player.location = location;
    player.role = role;
    player.age = age;
    player.additionalInfo = additionalInfo;
    player.admins = admins;
    player.Image = ManuImage;

    const updatedPlayer = await player.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: "Player updated successfully",
      data: updatedPlayer,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.sharePlayer = async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const adminId = req.body.adminId;
    const newAdmins = req.body.newAdmins;

    // Check if the requesting admin is not blocked
    const checkAdmin = await Admin.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      const error = new Error("This admin is either not found or blocked");
      error.statusCode = 404;
      return next(error);
    }

    const player = await Player.findOne({ _id: playerId, admins: adminId });

    if (!player) {
      const error = new Error("Player not found");
      error.statusCode = 404;
      return next(error);
    }

    if (Array.isArray(newAdmins) && newAdmins.length > 0) {
      for (const newAdminId of newAdmins) {
        if (!player.admins.includes(newAdminId)) {
          player.admins.push(newAdminId);
        } else {
          const error = new Error(
            `Admin with ID ${newAdminId} already exists for this player`
          );
          error.statusCode = 404;
          return next(error);
        }
      }
    }

    // Save the updated player with new admins added
    const updatedPlayer = await player.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player details updated with new admins",
      data: updatedPlayer,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

// * MATCH ********************************
exports.postAddMatch = async (req, res, next) => {
  try {
    const {
      admin,
      team1,
      team2,
      matchType,
      ballType,
      pitchType,
      numberOfOvers,
      oversPerBowler,
      cityOrTown,
      ground,
      matchDateTime,
    } = req.body;

    const MatchDetailsObj = {
      admin,
      team1,
      team2,
      matchType,
      ballType,
      pitchType,
      numberOfOvers,
      oversPerBowler,
      cityOrTown,
      ground,
      matchDateTime,
      whoWinsTheToss: null,
      tossDetails: null,
      matchStatus: 0, // Default matchStatus
      team1Batting: null,
      team2Batting: null,
      team1toss: null,
      team2toss: null,
      manOfTheMatch: null,
      team1Score: 0,
      team2Score: 0,
      team1Overs: 0,
      team2Overs: 0,
      team1Balls: 0,
      team2Balls: 0,
      team1Outs: 0,
      team2Outs: 0,
      squad1: null, // Default squad1
      squad2: null, // Default squad2
    };

    const newMatchDetails = new MatchDetails(MatchDetailsObj);

    const savedMatchDetails = await newMatchDetails.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Match Details has been added successfully",
      data: null,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

exports.postStartMatch = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const {
      whoWinsTheToss,
      tossDetails,
      matchStatus,
      squad1,
      squad2,
      team1Batting,
      team2Batting,
      team1toss,
      team2toss,
    } = req.body;

    // Update match details
    const updatedMatch = await MatchDetails.findByIdAndUpdate(
      matchId,
      {
        whoWinsTheToss,
        tossDetails,
        matchStatus,
        squad1,
        squad2,
        team1Batting,
        team2Batting,
        team1toss,
        team2toss,
      },
      { new: true }
    );

    if (!updatedMatch) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Match not found",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Match started successfully",
      data: updatedMatch,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

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

exports.getUpcomingMatches = async (req, res, next) => {
  try {
    const adminId = req.params.adminId;
    const matches = await MatchDetails.find({
      admin: adminId,
      matchStatus: 0,
    }).populate("team1 team2 squad1 squad2", "name image Image");

    if (!matches || matches.length === 0) {
      const error = new Error("No matches found");
      error.statusCode = 404;
      return next(error);
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

exports.getLiveMatches = async (req, res, next) => {
  try {
    const adminId = req.params.adminId;
    const matches = await MatchDetails.find({
      admin: adminId,
      matchStatus: 1,
    })
      .select(
        "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs -tournamentInfo"
      )
      .populate("team1 team2", "name image")
      .populate("squad1 squad2", "name");

    if (!matches || matches.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No matches found for the current admin.",
        data: null,
      });
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

exports.getMatchDetails = async (req, res, next) => {
  try {
    const matchId = req.params.matchId;
    const matches = await MatchDetails.findOne({
      _id: matchId,
      //   matchStatus: 1,
    })
      .populate(
        "team1 team2 squad1 squad2 openingBowler striker nonStriker manOfTheMatch currentOver.balls overs.balls playerStats.player bowlerStats.player",
        "name image Image runsScored isExtra ballTo description extraType wicketType isWicket age role"
      )
      .populate("lastWicket.player", "name -_id")
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");

    if (!matches || matches.length === 0) {
      const error = new Error("No matches found");
      error.statusCode = 404;
      return next(new Error("No match found!"));
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

// * TOURNAMENT ********************************

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

exports.updateTournament = async (req, res, next, cloudinary) => {
  try {
    const updateFields = Object.keys(req.body).reduce((acc, key) => {
      if (req.body[key] != null) {
        // check if the field is not null or undefined
        acc[key] = req.body[key];
      }
      return acc;
    }, {});

    if (req.body.admins) {
      updateFields.admins = Array.isArray(req.body.admins)
        ? req.body.admins.map((id) => mongoose.Types.ObjectId(id))
        : [];
    }

    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }

    let imageFile = null;
    const file = req.file;
    if (file) {
      imageFile = `data:image/png;base64,${file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(imageFile);
      imageFile = result.url;
      updateFields.image = imageFile;

      // Delete the old image from Cloudinary
      const oldImagePublicId = tournament.image.split("/").pop().split(".")[0];
      await cloudinary.uploader.destroy(oldImagePublicId);
    }

    const updatedTournament = await Tournament.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true }
    );

    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament updated successfully",
      data: null,
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
      "teams.team",
      "name image"
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

exports.putTeamToTournament = async (req, res, next) => {
  try {
    const { tournamentId, teamId } = req.body;
    const team = await Team.findById(teamId);
    if (!team) {
      const error = new Error("No team found");
      error.statusCode = 404;
      return next(error);
    }
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }

    const teamIndex = tournament.teams.findIndex(
      (t) => t.team.toString() === teamId.toString()
    );

    if (teamIndex === -1) {
      tournament.teams.push({
        team: teamId,
        qualified: false,
        eliminated: false,
      });
      await tournament.save();
    } else {
      const error = new Error("Team already exists");
      error.statusCode = 404;
      return next(error);
    }

    // create instance in points table
    const pointsTable = new PointsTable({
      tournament: tournament._id,
      team: team._id,
    });

    const savedPointsTable = await pointsTable.save();

    // if (!tournament.teams.includes(teamId)) {
    //   tournament.teams.push(teamId);
    //   await tournament.save();
    // } else {
    //   const error = new Error("Team already exists");
    //   error.statusCode = 404;
    //   return next(error);
    // }
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

exports.deleteTeamFromTournament = async (req, res, next) => {
  try {
    const { tournamentId, teamId } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error("No tournament found");
      error.statusCode = 404;
      return next(error);
    }
    const teamIndex = tournament.teams.findIndex(
      (t) => t.team.toString() === teamId.toString()
    );

    if (teamIndex > -1) {
      tournament.teams.splice(teamIndex, 1);
      await tournament.save();
    } else {
      const error = new Error("Team not found in tournament");
      error.statusCode = 404;
      return next(error);
    }
    res.status(200).json({
      status: 200,
      success: true,
      message: "Team removed from tournament successfully",
      data: tournament,
    });
  } catch (error) {
    next(error);
  }
};

exports.addTournamentMatch = async (req, res, next) => {
  try {
    const {
      admin,
      team1,
      team2,
      matchType,
      ballType,
      pitchType,
      numberOfOvers,
      oversPerBowler,
      cityOrTown,
      ground,
      matchDateTime,
      tournamentId,
      tournamentMatchType,
    } = req.body;

    const MatchDetailsObj = {
      admin,
      team1,
      team2,
      matchType,
      ballType,
      pitchType,
      numberOfOvers,
      oversPerBowler,
      cityOrTown,
      ground,
      matchDateTime,
      whoWinsTheToss: null,
      tossDetails: null,
      matchStatus: 0,
      team1Batting: null,
      team2Batting: null,
      team1toss: null,
      team2toss: null,
      manOfTheMatch: null,
      team1Score: 0,
      team2Score: 0,
      team1Overs: 0,
      team2Overs: 0,
      team1Balls: 0,
      team2Balls: 0,
      team1Outs: 0,
      team2Outs: 0,
      squad1: null,
      squad2: null,
      //   tournament: tournamentId,
      tournamentInfo: {
        tournament: tournamentId,
        matchType: tournamentMatchType,
      },
    };

    const newMatchDetails = new MatchDetails(MatchDetailsObj);

    const savedMatchDetails = await newMatchDetails.save();

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error(`Couldn't find tournament`);
      error.statusCode = 404;
      return next(error);
    }

    // const matchIndex = tournament.matches.findIndex(
    //   (m) => m.match.toString() === savedMatchDetails._id.toString()
    // );

    // if (matchIndex === -1) {
    //   tournament.matches.push({
    //     match: savedMatchDetails._id,
    //     matchType: tournamentMatchType,
    //   });
    //   await tournament.save();
    // }

    res.status(201).json({
      status: 201,
      success: true,
      message: "New match added successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.TournamentUpcomingMatches = async (req, res, next) => {
  try {
    const tournamentId = req.params.id;
    const matches = await MatchDetails.find({
      "tournamentInfo.tournament": mongoose.Types.ObjectId(tournamentId),
      matchStatus: 0,
    })
      .populate("team1 team2 squad1 squad2", "name image Image")
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");

    if (!matches || matches.length === 0) {
      const error = new Error("No matches found");
      error.statusCode = 404;
      return next(error);
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

exports.TournamentLiveMatches = async (req, res, next) => {
  try {
    const tournamentId = req.params.id;
    const matches = await MatchDetails.find({
      "tournamentInfo.tournament": mongoose.Types.ObjectId(tournamentId),
      matchStatus: 1,
    })
      .select(
        "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
      )
      .populate("team1 team2", "name image")
      .populate("squad1 squad2", "name")
      .populate("tournamentInfo.tournament", "seriesName seriesLocation");

    if (!matches || matches.length === 0) {
      const error = new Error("Tournament contains no matches");
      error.statusCode = 404;
      return next(error);
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

exports.postGroupToTournament = async (req, res, next) => {
  try {
    const { groupName } = req.body;
    const tournamentId = req.params.tournamentId;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      const error = new Error("No tournament found with that ID");
      error.statusCode = 404;
      return next(error);
    }

    const pointsTable = new PointsTable({
      tournament: tournament._id,
    });
    const savedPointsTable = await pointsTable.save();

    tournament.groups.push({
      name: groupName,
      teams: [],
      pointsTable: null,
    });

    await tournament.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Successfully created a new group",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};
