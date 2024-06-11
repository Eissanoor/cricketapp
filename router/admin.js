const fs = require("fs");
const path = require("path");

const express = require("express");
const router = new express.Router();
const { ObjectId } = require("mongodb");
const bodyparser = require("body-parser");
const nodemailer = require("nodemailer");
const validator = require("validator");
const cron = require("node-cron");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieparser = require("cookie-parser");
// const multer = require("multer");
const auth = require("../middleware/auth");
const { profile } = require("console");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const EmailVarify = require("../models/varifyemail");
const Admin = require("../models/admin");
const ejs = require("ejs");

// Schemas
const Player = require("../models/player");
const Team = require("../models/team");
const MatchDetails = require("../models/match_details");
const Tournament = require("../models/tournament");

const validators = require("../utils/validators");
const adminMiddleware = require("../middleware/admin");

const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage: storage });

// const cors = require("cors");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// router.use(cors());
router.use(cookieparser());
router.use(bodyparser.urlencoded({ extended: true }));
router.use(express.urlencoded({ extended: false }));
router.use(bodyparser.json());
router.use(express.json());

const adminController = require("../controllers/admin");

const EMAIL = process.env.EMAIL;
const PASS = process.env.Email_otp_pass;
const DOMAIN = process.env.HOST + ":" + process.env.PORT;

function generateOTP() {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

router.post("/signup", async (req, res, next) => {
  try {
    const email = req.body.email;
    const code = generateOTP();
    const useremail = await Admin.findOne({ email: email });
    if (useremail) {
      res.status(400).json({
        status: 400,
        success: false,
        message: "This email is already used, try another one",
        data: null,
      });
    } else {
      const emailvarifyadd = new EmailVarify({
        email: email,
        code: code,
      });
      const registered = await emailvarifyadd.save();
      console.log(registered);

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASS,
        },
      });

      const templatePath = path.join(
        __dirname,
        "..",
        "views",
        "signupEmail.ejs"
      );
      const template = fs.readFileSync(templatePath, "utf8");
      const html = ejs.render(template, {
        code: code,
        logoPath: `${DOMAIN}/images/logo.png`,
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Welcome! Verify Your Email Address",
        html: html,
      };

      await transporter.sendMail(mailOptions);

      res.status(201).json({
        status: 201,
        success: true,
        message: "OTP sent successfully",
        data: null,
      });
    }
  } catch (error) {
    next(error);
  }
});
router.post("/emailVrifyOtp", async (req, res, next) => {
  try {
    const email = req.body.email;
    const code = req.body.code;
    const mail = await EmailVarify.findOne({ code: code, email: email });
    if (mail) {
      const currentTime = new Date().getTime();
      const Diff = mail.expireIn - currentTime;
      if (Diff < 0) {
        res.status(401).json({
          status: 401,
          message: "otp expire with in 5 mints",
          data: null,
        });
      } else {
        const registerEmp = new Admin({
          password: req.body.password,
          email: email,
          fullname: req.body.fullname,
          ProfileImage: null,
          address: null,
          status: 1,
          Phone: req.body.phone,
          isVarified: false,
          isNewUser: true,
        });
        await registerEmp.save();
        res.status(200).json({
          status: 200,
          success: true,
          message: "email varification successful",
          data: null,
        });
      }
    } else {
      res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid Otp",
        data: null,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: 400,
      success: false,
      message: "Invalid Otp",
      data: null,
    });
  }
});
router.post("/Login", async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const oneMonthInMillis = 30 * 24 * 60 * 60 * 1000;
    const expirationTime = new Date().getTime() + oneMonthInMillis;
    const useremail = await Admin.findOne({ email: email });
    const ismatch = await bcrypt.compare(password, useremail.password);

    if (!useremail || !password) {
      res.status(400).json({
        status: 400,
        message: "Enter Correct email or password",
        data: null,
      });
    } else if (ismatch) {
      const getmens = await Admin.findOneAndUpdate(
        { email: email },
        { $set: { expireIn: expirationTime } },
        { new: true }
      );
      const token = await useremail.generateAuthToken();
      res.cookie("jwt", token, { httpOnly: true });
      res.status(200).json({
        status: 200,
        message: "Login Successfully",
        success: true,
        data: {
          _id: useremail._id,
          isVerified: useremail.isVarified,
          isNewUser: useremail.isNewUser,
          accessToken: token,
        },
      });
    } else {
      res.status(404).json({
        status: 400,
        success: false,
        message: "Invalid Password",
        data: null,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: 400,
      success: false,
      message: "invalid email",
      data: null,
    });
  }
});
router.get("/get-user-detail/:_id", async (req, res, next) => {
  try {
    const _id = req.params._id;
    const data = await Admin.findOne({ _id: _id }).select({
      _id: 1,
      email: 1,
      Phone: 1,
      status: 1,
      address: 1,
      fullname: 1,
      ProfileImage: 1,
    });
    res.status(200).json({
      status: 200,
      success: true,
      message: "admin details",
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "internel server error",
      data: null,
    });
  }
});
router.post("/send-otp-forpassword-change", async (req, res, next) => {
  try {
    let email = req.body.email;
    const mail = await Admin.findOne({ email: email });
    if (!mail) {
      const error = new Error("Email not found");
      error.statusCode = 404;
      return next(error);
    } else {
      const random = generateOTP();
      const otpData = new EmailVarify({
        email: email,
        code: random,
        expireIn: new Date().getTime() + 60 * 10000,
      });

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: EMAIL,
          pass: PASS,
        },
      });

      const templatePath = path.join(
        __dirname,
        "..",
        "views",
        "passwordResetEmail.ejs"
      );
      const template = fs.readFileSync(templatePath, "utf8");
      const html = ejs.render(template, {
        random: random,
        logoPath: `${DOMAIN}/images/logo.png`,
      });

      const mailOptions = {
        from: process.env.EMAIL,
        to: email,
        subject: "Password Reset Request - Verify Your Email",
        html: html,
      };

      await transporter.sendMail(mailOptions);
      await otpData.save();
      res.status(201).json({
        status: 201,
        success: true,
        message: "OTP sent successfully",
        data: { Otp: random },
      });
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});
router.post("/password-otp-varify", async (req, res, next) => {
  try {
    const email = req.body.email;
    const code = req.body.code;
    const mail = await EmailVarify.findOne({ code: code, email: email });
    if (mail) {
      const currentTime = new Date().getTime();
      const Diff = mail.expireIn - currentTime;
      if (Diff < 0) {
        res.status(401).json({
          status: 401,
          success: false,
          message: "otp expire with in 5 mints",
          data: null,
        });
      } else {
        res.status(200).json({
          status: 200,
          success: true,
          message: "password otp varification successful",
          data: null,
        });
      }
    } else {
      res.status(400).json({
        status: 400,
        success: false,
        message: "Invalid Otp",
        data: null,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: 400,
      success: false,
      message: "Invalid Otp",
      data: null,
    });
  }
});
router.post("/changePassword", async (req, res, next) => {
  try {
    const email = req.body.email;
    const mailVarify = await Admin.findOne({ email: email });
    const password = req.body.password;
    const ismatch = await bcrypt.compare(password, mailVarify.password);
    console.log(ismatch);
    mailVarify.password = password;
    const registered = await mailVarify.save();
    res.status(201).json({
      status: 201,
      success: true,
      message: "password change successful",
      data: null,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      status: 400,
      success: false,
      message: "Invalid email",
      data: null,
    });
  }
});
const clearCollection = async () => {
  try {
    const result = await EmailVarify.deleteMany({});
    return result.deletedCount;
  } catch (error) {
    console.error("Error clearing collection:", error);
    throw error;
  }
};
cron.schedule("59 23 */1 * *", async () => {
  try {
    const deletedCount = await clearCollection();
    console.log(`Deleted ${deletedCount} documents.`);
  } catch (error) {
    console.error("Error running cron job:", error);
  }
});

// * ADMIN RELATED ACTIVITIES ************************************************************

router.get("/admin/details/:id", adminController.getAdminDetails);

router.get("/admin/invitations/:adminId", adminController.getAdminInvitations);

router.put(
  "/access",
  adminMiddleware.checkAdminBlocked,
  adminController.putAccess
);

router.put(
  "/access/response",
  adminMiddleware.checkAdminBlocked,
  adminController.invitationResponse
);

router.post("/get-other-admin-by-adminid", adminController.getOtherAdmins);

// * Player * * * * * * * * * * * * * * * *

router.post(
  "/add-players",
  upload.single("Image"),
  validators.validatePlayer,
  adminMiddleware.checkAdminBlocked,
  adminController.postAddPlayer
  //   async (req, res, next) => {
  //     await adminController.postAddPlayer(req, res, next, cloudinary);
  //   }
);
router.get(
  "/get-player-detail-by-adminid/:admin",
  adminController.playerDetailsByAdminId
);
router.post(
  "/get-player-detail-by-playerid",
  adminController.playerDetailsByPlayerId
);
router.delete(
  "/delete-player-byid",
  adminController.deletePlayer
  // async (req, res, next) => {
  //   await adminController.deletePlayer(req, res, next, cloudinary);
  // },
);
router.put(
  "/update-player",
  upload.single("Image"),
  validators.validateUpdatePlayer,
  adminMiddleware.checkAdminBlocked,
  adminController.updatePlayer
  //   async (req, res, next) => {
  //     await adminController.updatePlayer(req, res, next, cloudinary);
  //   }
);
router.put(
  "/share-player",
  adminMiddleware.checkAdminBlocked,
  adminController.sharePlayer
);

// * Team * * * * * * * * * * * * * * * * *
router.post(
  "/add-team",
  upload.single("image"),
  validators.validateTeam,
  adminMiddleware.checkAdminBlocked,
  adminController.postAddTeam
  //   async (req, res, next) => {
  //     await adminController.postAddTeam(req, res, next, cloudinary);
  //   }
);
router.post("/get-teams", adminController.getTeams);

router.put(
  "/update-team",
  upload.single("image"),
  adminController.putUpdateTeam
  // async (req, res, next) => {
  //   await adminController.putUpdateTeam(req, res, next, cloudinary);
  // },
);
router.delete(
  "/delete-team-byid",
  adminController.deleteTeam
  // async (req, res, next) => {
  //   await adminController.deleteTeam(res, res, next, cloudinary);
  // },
);
router.put(
  "/in-team-add-player",
  adminMiddleware.checkAdminBlocked,
  adminController.putPlayerToTeam
);
router.put(
  "/share-team",
  adminMiddleware.checkAdminBlocked,
  adminController.putShareTeam
);
router.get("/get-players-by-teamId/:teamID", adminController.getTeamPlayers);

// * Match Details * * * * * * * * * * * * * * * * * * *
router.post(
  "/add-match-details",
  validators.validateMatch,
  adminMiddleware.checkAdminBlocked,
  adminController.postAddMatch
);

router.post(
  "/add-match-details/:id",
  validators.validateMatch,
  adminMiddleware.checkAdminBlocked,
  adminController.putAddMatch
);

router.put(
  "/start-match/:matchId",
  validators.validateStartMatch,
  adminController.postStartMatch
);
router.get(
  "/get-upcoming-matches/:adminId",
  adminController.getUpcomingMatches
);
router.get(
  "/get-MatchDetails-by-MatchDetailsId/:MatchDetailID",
  async (req, res, next) => {
    try {
      const teamID = req.params.MatchDetailID;
      const data = await MatchDetails.find({ _id: teamID });

      if (!data) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "MatchDetails not found",
          data: null,
        });
      }

      res.status(200).json({
        status: 200,
        success: true,
        message: "MatchDetails details",
        data: data,
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
  }
);
router.get("/get-allMatchDetails", async (req, res, next) => {
  try {
    const data = await MatchDetails.find();

    if (!data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "MatchDetails not found",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "MatchDetails details",
      data: data,
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
});
router.get(
  "/get-all-MatchDetails-byadmin/:adminIDs",
  async (req, res, next) => {
    try {
      const adminIDs = req.params.adminIDs;
      const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
      const limit = parseInt(req.query.limit) || 10; // Default to 10 documents per page

      const skip = (page - 1) * limit;

      const data = await MatchDetails.find({ admin: adminIDs })
        .skip(skip)
        .limit(limit);

      const totalCount = await MatchDetails.countDocuments({ admin: adminIDs });

      if (!data || data.length === 0) {
        return res.status(404).json({
          status: 404,
          success: false,
          message: "MatchDetails not found",
          data: null,
        });
      }

      res.status(200).json({
        status: 200,
        success: true,
        message: "MatchDetails found",
        data: data,
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
  }
);
router.get("/get-live-matches/:adminId", adminController.getLiveMatches);
router.get("/get-match-details/:matchId", adminController.getMatchDetails);
router.put("/set-man-of-the-match", adminController.setManOfTheMatch);

// * Tournament matches * * * * * * * * * * * * * * * * * * *
router.post(
  "/tournament",
  upload.single("image"),
  validators.validateTournament,
  adminMiddleware.checkAdminBlocked,
  adminController.postTournament
  //   async (req, res, next) => {
  //     await adminController.postTournament(req, res, next, cloudinary);
  //   }
);

router.put(
  "/tournament/:tournamentId",
  upload.single("image"),
  validators.validateTournament,
  adminMiddleware.checkAdminBlocked,
  adminController.updateTournament
  //   (req, res, next) => {
  //     adminController.updateTournament(req, res, next, cloudinary);
  //   }
);

router.get("/tournaments", adminController.getTournaments);

router.get("/tournament/:tournamentId", adminController.getTournament);

router.put(
  "/team-to-tournament",
  adminMiddleware.checkAdminBlocked,
  adminController.putTeamToTournament
);

router.delete(
  "/team-to-tournament",
  adminMiddleware.checkAdminBlocked,
  adminController.deleteTeamFromTournament
);

router.post(
  "/add-tournament-match",
  validators.validateTournamentMatch,
  adminMiddleware.checkAdminBlocked,
  adminController.addTournamentMatch
);

router.post(
  "/add-tournament-match/:matchId",
  //   validators.validateTournamentMatch,
  adminMiddleware.checkAdminBlocked,
  adminController.updateTournamentMatch
);

router.get(
  "/tournament/upcoming/:id",
  adminController.tournamentUpcomingMatches
);

router.get("/tournament/live/:id", adminController.tournamentLiveMatches);

router.get(
  "/tournament/completed/:id",
  adminController.tournamentCompletedMatches
);

router.put(
  "/group-to-tournament/:tournamentId",
  adminMiddleware.checkAdminBlocked,
  adminController.putGroupToTournament
);

router.put(
  "/group/from/tournament",
  adminMiddleware.checkAdminBlocked,
  adminController.deleteGroupFromTournament
);

router.put(
  "/team-to-tournament-group",
  adminMiddleware.checkAdminBlocked,
  adminController.putTeamToTournamentGroup
);

router.put(
  "/team-from-tournament-group",
  adminMiddleware.checkAdminBlocked,
  adminController.deleteTeamFromTournamentGroup
);

// router.get("/api/get/groupPointsTable", adminController.getGroupPointsTable);

module.exports = router;
