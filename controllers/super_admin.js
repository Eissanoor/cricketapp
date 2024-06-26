const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/super_admin");
const Admin = require("../models/admin");
const News = require("../models/news");
const SocialLink = require("../models/social_link");
const Report = require("../models/report");
const Video = require("../models/video");
const Player = require("../models/player");
const Team = require("../models/team");
const Tournament = require("../models/tournament");
const MatchDetails = require("../models/match_details");
const User = require("../models/user");

const { cloudinary } = require("../config/cloudinary");
const { sendEmail } = require("../utils/emailHelper");
const admin = require("../services/firebaseService");

// CONSTANTS
const DOMAIN = process.env.HOST + ":" + process.env.PORT;

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const superAdmin = await SuperAdmin.findOne({ email: email });
    if (!superAdmin) {
      const error = new Error("No SuperAdmin found with this email");
      error.statusCode = 404;
      return next(error);
    }

    const passwordMatch = await bcrypt.compare(password, superAdmin.password);
    if (!passwordMatch) {
      const error = new Error("Password does not match");
      error.statusCode = 401;
      return next(error);
    }

    // const token = jwt.sign(
    //   { superAdminId: superAdmin._id.toString() },
    //   "yourJWTsecret",
    //   { expiresIn: "1h" }
    // );

    res.status(200).json({
      status: 200,
      success: true,
      message: "SuperAdmin logged in successfully",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// * Admins Section ***

exports.getAdmins = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const admins = await Admin.find()
      .skip(skip)
      .limit(limit)
      .select("email status Phone ProfileImage fullname createdAt updatedAt");
    if (!admins || admins.length === 0) {
      const error = new Error("No Admins found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Admins fetched successfully",
      data: admins,
    });
  } catch (err) {
    next(err);
  }
};

exports.changeAdminStatus = async (req, res, next) => {
  const adminId = req.params.adminId;
  const status = parseInt(req.body.status);

  if (![0, 1].includes(status)) {
    const error = new Error("Invalid status value. Status must be 0 or 1");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      return next(error);
    }

    admin.status = status;
    await admin.save();

    const templateName = status === 0 ? "adminBlocked" : "adminUnblocked";
    const subject =
      status === 0
        ? "Account Blocked Notification"
        : "Account Unblocked Notification";

    const logoPath = `${DOMAIN}/images/logo.png`;

    await sendEmail({
      to: admin.email,
      subject: subject,
      templateName: templateName,
      data: {
        firstName: admin.fullname || "Admin", // Fallback if fullname is not defined
        logoPath: logoPath, // Pass logoPath to the sendEmail function
      },
    });

    res.status(200).json({
      status: 200,
      success: true,
      message: `Admin status updated and ${
        status === 0 ? "block" : "unblock"
      } notification sent successfully`,
      data: admin,
    });
  } catch (error) {
    console.error("Error when changing status or sending email:", error);
    next(error);
  }
};

exports.deleteAdmin = async (req, res, next) => {
  const adminId = req.params.adminId;

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      return next(error);
    }

    // Before we actually remove the admin, i want to remove all the things related to this admin
    // 1. Remove all the players
    // 2. Remove all the teams
    // 3. Remove all the tournaments

    // 1. Remove all the players
    await Player.deleteAllPlayersByAdmin(adminId);

    // 2. Remove all the teams
    await Team.deleteAllTeamsByAdmin(adminId);

    // 3. Remove all the tournaments
    await Tournament.deleteAllTournamentsByAdmin(adminId);

    // Now we can remove the admin
    await admin.remove();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Admin deleted successfully",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// * News Section ***

exports.postNews = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const imageUrl = req.file ? req.file.path : null;
    const publicId = req.file ? req.file.filename : null; // Get the public_id from req.file

    const news = new News({
      title: title,
      description: description,
      image: imageUrl,
      public_id: publicId,
    });

    await news.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "News article created successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.getNews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const news = await News.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    if (!news || news.length === 0) {
      const error = new Error("No news articles found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "News articles fetched successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.putNews = async (req, res, next) => {
  const newsId = req.params.newsId;
  const { title, description } = req.body;
  const imageFile = req.file;

  try {
    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("News article not found");
      error.statusCode = 404;
      return next(error);
    }

    if (title) {
      news.title = title;
    }

    if (description) {
      news.description = description;
    }

    if (imageFile) {
      // delete old image stored in the cloudinary
      if (news.public_id) {
        await cloudinary.uploader.destroy(news.public_id);
      }

      const imageUrl = req.file ? req.file.path : null;
      const publicId = req.file ? req.file.filename : null;

      // update image and public_id fields
      news.image = imageUrl;
      news.public_id = publicId;
    }

    await news.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "News article updated successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteNews = async (req, res, next) => {
  const newsId = req.params.newsId;

  try {
    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("News article not found");
      error.statusCode = 404;
      return next(error);
    }

    // delete file from cloudinary
    const publicId = news.public_id; // Replace with the appropriate field name
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error(error);
        return;
      }
    });

    await news.remove();

    res.status(200).json({
      status: 200,
      success: true,
      message: "News article deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.putViewNews = async (req, res, next) => {
  const { newsId, adminId } = req.body;

  try {
    if (newsId == null || newsId == undefined) {
      const error = new Error("News ID is required");
      error.statusCode = 400;
      return next(error);
    }

    if (adminId == null || adminId == undefined) {
      const error = new Error("Admin ID is required");
      error.statusCode = 400;
      return next(error);
    }

    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("No news found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    if (!news.viewers.includes(adminId)) {
      news.viewers.push(adminId);
      await news.save();
    } else {
      const error = new Error("You have already viewed this news");
      error.statusCode = 400;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "News views increased successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Social link Section ***

exports.postSocialLink = async (req, res, next) => {
  const { mediaType, link } = req.body;

  try {
    const socialLink = new SocialLink({ mediaType, link });

    await socialLink.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Social link created successfully",
      data: socialLink,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLink.find().sort({ _id: -1 });

    if (!socialLinks || socialLinks.length === 0) {
      const error = new Error("No social links found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social links retrieved successfully",
      data: socialLinks,
    });
  } catch (error) {
    next(error);
  }
};

exports.putSocialLink = async (req, res, next) => {
  const { mediaType, link } = req.body;
  const { id } = req.params;

  try {
    const socialLink = await SocialLink.findById(id);

    if (!socialLink) {
      const error = new Error("No social link found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    socialLink.mediaType = mediaType;
    socialLink.link = link;

    await socialLink.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social link updated successfully",
      data: socialLink,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSocialLink = async (req, res, next) => {
  const { id } = req.params;

  try {
    const socialLink = await SocialLink.findById(id);

    if (!socialLink) {
      const error = new Error("No social link found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    await SocialLink.findByIdAndRemove(id);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social link deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// * Reports Section ***

exports.postReport = async (req, res, next) => {
  try {
    const { name, contactNo, report } = req.body;

    const newReport = new Report({
      name,
      contactNo,
      report,
    });

    const savedReport = await newReport.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Report submitted successfully",
      data: savedReport,
    });
  } catch (error) {
    next(error);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const reports = await Report.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Reports fetched successfully",
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReport = async (req, res, next) => {
  const { id } = req.params;

  try {
    const report = await Report.findById(id);

    if (!report) {
      const error = new Error("No report found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    await Report.findByIdAndRemove(id);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// * Videos Section ***

exports.postVideo = async (req, res, next) => {
  const { title, description } = req.body;
  const videoFile = req.file;

  try {
    // assuming videoUrl is path where video is stored
    const videoUrl = videoFile.path;
    const publicId = videoFile.filename; // Get the public_id from videoFile.filename

    const video = new Video({
      title,
      description,
      videoUrl,
      public_id: publicId,
      viewers: [],
    });

    await video.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Video successfully uploaded",
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const videos = await Video.find().sort({ _id: -1 }).skip(skip).limit(limit);

    if (videos.length === 0) {
      const error = new Error("No videos found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Videos fetched successfully",
      data: videos,
    });
  } catch (error) {
    next(error);
  }
};

exports.putVideo = async (req, res, next) => {
  const { title, description } = req.body;
  const { videoId } = req.params;
  const videoFile = req.file;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    if (title) {
      video.title = title;
    }

    if (description) {
      video.description = description;
    }

    // if a new video file is provided
    if (videoFile) {
      // delete the old video file from Cloudinary
      if (video.public_id) {
        await cloudinary.uploader.destroy(video.public_id, {
          resource_type: "video",
        });
      }

      const videoUrl = videoFile.path;
      const publicId = videoFile.filename;

      // update with new video url and public_id
      video.videoUrl = videoUrl;
      video.public_id = publicId;
    }

    await video.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteVideo = async (req, res, next) => {
  const { videoId } = req.params;

  try {
    const video = await Video.findById(videoId);

    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    // delete video from cloudinary
    cloudinary.uploader.destroy(
      video.public_id, // Use the public_id from the Video model
      { resource_type: "video" },
      (error, result) => {
        if (error) {
          console.error(error);
          return;
        }
      }
    );

    await Video.findByIdAndRemove(videoId);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.putViewVideo = async (req, res, next) => {
  const { videoId, adminId } = req.body;

  try {
    if (videoId == null || videoId == undefined) {
      const error = new Error("Video ID is required");
      error.statusCode = 400;
      return next(error);
    }

    if (adminId == null || adminId == undefined) {
      const error = new Error("Admin ID is required");
      error.statusCode = 400;
      return next(error);
    }

    const video = await Video.findById(videoId);
    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    if (!video.viewers.includes(adminId)) {
      video.viewers.push(adminId);
      await video.save();
    } else {
      const error = new Error("You have already viewed this video");
      error.statusCode = 400;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video views increased successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Players Section ***

exports.getPlayers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.query || "";

    const skip = (page - 1) * limit;

    let players;
    let totalPlayers;

    if (query) {
      const searchCriteria = {
        name: { $regex: query, $options: "i" }, // Case-insensitive regex search on name
      };

      players = await Player.find(searchCriteria)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);

      totalPlayers = await Player.countDocuments(searchCriteria);
    } else {
      players = await Player.find().sort({ _id: -1 }).skip(skip).limit(limit);

      totalPlayers = await Player.countDocuments();
    }

    if (!players || players.length === 0) {
      const error = new Error("No players found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Players fetched successfully",
      data: players,
      totalPlayers: totalPlayers, // Include totalPlayers in the response
    });
  } catch (error) {
    next(error);
  }
};

exports.putPlayer = async (req, res, next) => {
  try {
    const { playerId } = req.params;
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

    const player = await Player.findById(playerId);

    if (!player) {
      const error = new Error("No player found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    const adminObjectIds = Array.isArray(admins)
      ? admins.map((id) => mongoose.Types.ObjectId(id))
      : [];

    if (req.file) {
      // delete old image stored in the cloudinary
      if (player.public_id) {
        await cloudinary.uploader.destroy(player.public_id);
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // update image and public_id fields
      player.Image = imageUrl;
      player.public_id = publicId;
    }

    if (name) player.name = name;
    if (location) player.location = location;
    if (role) player.role = role;
    if (age) player.age = age;
    if (additionalInfo) player.additionalInfo = additionalInfo;
    if (admins) player.admins = adminObjectIds;
    if (sixes || fours || wickets) {
      player.stats = {
        sixes: sixes,
        fours: fours,
        wickets: wickets,
      };
    }

    const updatedPlayer = await player.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player has been updated successfully",
      data: updatedPlayer,
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePlayer = async (req, res, next) => {
  try {
    const { playerId } = req.params;

    const player = await Player.findById(playerId);

    if (!player) {
      const error = new Error("No player found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    // If the player has an image, delete it from Cloudinary
    if (player.public_id) {
      await cloudinary.uploader.destroy(player.public_id, {
        resource_type: "image",
      });
    }

    await Player.findByIdAndRemove(playerId);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player has been deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Teams Section ***

exports.getTeams = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const query = req.query.query || "";

    const skip = (page - 1) * limit;

    let teams;
    let totalTeams;

    if (query) {
      const searchCriteria = {
        name: { $regex: query, $options: "i" }, // Case-insensitive regex search on name
      };

      teams = await Team.find(searchCriteria)
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("players", "name location role age additionalInfo Image");

      totalTeams = await Team.countDocuments(searchCriteria);
    } else {
      teams = await Team.find()
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate("players", "name location role age additionalInfo Image");

      totalTeams = await Team.countDocuments();
    }

    if (!teams || teams.length === 0) {
      const error = new Error("No teams found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Fetched teams successfully",
      data: teams,
      totalTeams: totalTeams, // Include totalTeams in the response
    });
  } catch (error) {
    next(error);
  }
};

exports.putTeam = async (req, res, next) => {
  try {
    const teamId = req.params.teamId;
    const { name, location } = req.body;

    const team = await Team.findById({ _id: teamId });
    if (!team) {
      const error = new Error("Team not found");
      error.statusCode = 404;
      return next(error);
    }

    if (req.file) {
      // If there's a previous image, delete it
      if (team.public_id) {
        await cloudinary.uploader.destroy(team.public_id);
      }

      const imageUrl = req.file.path;
      const publicId = req.file.filename;

      // update image and public_id fields
      team.image = imageUrl;
      team.public_id = publicId;
    }

    if (name) team.name = name;
    if (location) team.location = location;

    const updatedTeam = await team.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: "Team updated successfully",
      data: updatedTeam,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTeam = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    const team = await Team.findById(teamId);

    if (!team) {
      const error = new Error("No team found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    // If the team has an image, delete it from Cloudinary
    if (team.public_id) {
      await cloudinary.uploader.destroy(team.public_id, {
        resource_type: "image",
      });
    }

    await Team.findByIdAndRemove(teamId);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Team has been deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Tournament Section ***

exports.getTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find().sort({ _id: -1 });
    if (tournaments.length === 0) {
      const error = new Error("No tournaments found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Fetched tournaments successfully",
      data: tournaments,
    });
  } catch (error) {
    next(error);
  }
};

exports.putTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const {
      seriesName,
      seriesLocation,
      tournamentType,
      numberOfOvers,
      numberOfTeams,
      startDate,
      endDate,
    } = req.body;

    const imageUrl = req.file ? req.file.path : null;
    const publicId = req.file ? req.file.filename : null;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      const error = new Error("No tournament found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    // If a new image is being provided and the tournament already has an image, delete the old image from Cloudinary
    if (imageUrl && tournament.public_id) {
      await cloudinary.uploader.destroy(tournament.public_id, {
        resource_type: "image",
      });
    }

    tournament.image = imageUrl || tournament.image;
    tournament.public_id = publicId || tournament.public_id;
    tournament.seriesName = seriesName || tournament.seriesName;
    tournament.seriesLocation = seriesLocation || tournament.seriesLocation;
    tournament.tournamentType = tournamentType || tournament.tournamentType;
    tournament.numberOfOvers = numberOfOvers || tournament.numberOfOvers;
    tournament.numberOfTeams = numberOfTeams || tournament.numberOfTeams;
    tournament.startDate = startDate || tournament.startDate;
    tournament.endDate = endDate || tournament.endDate;

    const result = await tournament.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteTournament = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;

    const tournament = await Tournament.findById(tournamentId);

    if (!tournament) {
      const error = new Error("No tournament found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    // If the tournament has an image, delete it from Cloudinary
    if (tournament.public_id) {
      await cloudinary.uploader.destroy(tournament.public_id, {
        resource_type: "image",
      });
    }

    // Delete all the matches belonging to that tournament
    await MatchDetails.deleteMany({
      "tournamentInfo.tournament": tournamentId,
    });

    await Tournament.findByIdAndRemove(tournamentId);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Tournament has been deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Matches Section ***

exports.getMatches = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    // Fetch matches with pagination and populate team1 and team2 fields along with players
    const matches = await MatchDetails.find()
      .select(
        "team1 team2 matchStatus cityOrTown ground matchDateTime numberOfOvers tournamentInfo"
      )
      .populate({
        path: "team1",
        select: "name image",
        populate: {
          path: "players",
          select: "name position role age Image additionalInfo",
        },
      })
      .populate({
        path: "team2",
        select: "name image",
        populate: {
          path: "players",
          select: "name position role age Image additionalInfo",
        },
      })
      .populate({
        path: "tournamentInfo.tournament",
        select: "seriesName",
      })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    if (!matches || matches.length === 0) {
      const error = new Error("No matches found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Matches fetched successfully",
      data: matches,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteMatch = async (req, res, next) => {
  try {
    const matchId = req.params.id;

    // Find and delete the match by its ID
    const match = await MatchDetails.findByIdAndDelete(matchId);

    if (!match) {
      const error = new Error("Match not found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Match deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// * Notification Section ***

exports.storeFcmToken = async (req, res, next) => {
  const { userId, token } = req.body;

  try {
    // Find the user by userId
    let user = await User.findOne({ userId: userId });

    if (user) {
      // If user exists, update the FCM token and lastViewed
      user.fcmToken = token;
      user.lastViewed = Date.now();
    } else {
      // If user does not exist, create a new user with the FCM token and lastViewed
      user = new User({
        userId: userId,
        fcmToken: token,
        lastViewed: Date.now(),
      });
    }

    // Save the user
    await user.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "FCM token successfully stored",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

exports.sendNotification = async (req, res, next) => {
  const { title, body } = req.body;

  try {
    // Retrieve all FCM tokens from the database
    const users = await User.find({}, "fcmToken");
    const tokens = users.map((user) => user.fcmToken);

    if (tokens.length === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "No devices found",
      });
    }

    // Create a message object for each token
    const messages = tokens.map((token) => ({
      token: token,
      notification: {
        title: title,
        body: body,
        image: `${DOMAIN}/images/logo.png`,
      },
      data: {
        key: "value",
      },
    }));

    // Send notifications to all tokens
    const response = await admin.messaging().sendAll(messages);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Notifications sent successfully",
      data: response,
    });
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({
        status: 500,
        success: false,
        message: "Failed to send notifications",
        error: error.message,
      });
    }
    next(error);
  }
};

// * Viewers Section ***

exports.getCounts = async (req, res, next) => {
  try {
    // Calculate the start and end of the current day
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    // Calculate the start and end of the current week
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const endOfWeek = new Date(endOfDay);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));

    // Calculate the start and end of the current month
    const startOfMonth = new Date(startOfDay);
    startOfMonth.setDate(1);
    const endOfMonth = new Date(endOfDay);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);

    const aggregateViewers = async (start, end) => {
      const viewers = await User.aggregate([
        {
          $match: {
            lastViewed: {
              $gte: start,
              $lt: end,
            },
          },
        },
        {
          $group: {
            _id: null,
            uniqueViewers: { $addToSet: "$userId" },
          },
        },
        {
          $project: {
            _id: 0,
            uniqueViewersCount: { $size: "$uniqueViewers" },
          },
        },
      ]);
      return viewers[0] ? viewers[0].uniqueViewersCount : 0;
    };

    const dailyViewers = await aggregateViewers(startOfDay, endOfDay);
    const weeklyViewers = await aggregateViewers(startOfWeek, endOfWeek);
    const monthlyViewers = await aggregateViewers(startOfMonth, endOfMonth);

    // Fetch the total number of players and teams
    const totalPlayers = await Player.countDocuments();
    const totalTeams = await Team.countDocuments();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Fetched viewers successfully",
      data: {
        dailyViewers,
        weeklyViewers,
        monthlyViewers,
        totalPlayers,
        totalTeams,
      },
    });
  } catch (error) {
    next(error);
  }
};
