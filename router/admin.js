const express = require("express");
const router = new express.Router();
const { ObjectId } = require("mongodb");
const bodyparser = require("body-parser");
const nodemailer = require("nodemailer");
const validator = require("validator");
const cron = require("node-cron");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookieparser = require("cookie-parser");
const multer = require("multer");
const auth = require("../middleware/auth");
const { profile } = require("console");
const cloudinary = require("cloudinary").v2;
const mongoose = require("mongoose");
const { firebase_matchDetails, teamDetails } = require("../database/firebase");
const EmailVarify = require("../models/varifyemail");
const providerRegister = require("../models/providerregister");

// Schemas
const Player = require("../models/player");
const Team = require("../models/team");
const MatchDetails = require("../models/match_details");
const Tournament = require("../models/tournament");

const validators = require("../utils/validators");

// const cors = require("cors");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
// router.use(cors());
router.use(cookieparser());
router.use(bodyparser.urlencoded({ extended: true }));
router.use(express.urlencoded({ extended: false }));
router.use(bodyparser.json());
router.use(express.json());
const mailgun = require("mailgun-js");
const mailGun = process.env.mailGun;
const DOMAIN = mailGun;
const Email_otp_pass = process.env.Email_otp_pass;
const C_cloud_name = process.env.C_cloud_name;
const C_api_key = process.env.C_api_key;
const C_api_secret = process.env.C_api_secret;
const MailGun_api_key = process.env.MailGun_api_key;
cloudinary.config({
  cloud_name: C_cloud_name,
  api_key: C_api_key,
  api_secret: C_api_secret,
});
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
router.use("/ProfileImage", express.static("public/upload"));
router.use("/Image", express.static("public/upload"));
router.use("/categoryThumbnail", express.static("public/upload"));

require("../database/db");

const adminController = require("../controllers/admin");

function generateOTP() {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 4; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}
router.get("/", (req, res, next) => {
  res.json({
    status: 200,
    success: true,
    message: "THIS IS HOME PAGE into development server",
    data: null,
  });
});
router.post("/signup", async (req, res, next) => {
  try {
    const email = req.body.email;
    const code = generateOTP();
    const useremail = await providerRegister.findOne({ email: email });
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
      var transpoter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "wasimxaman13@gmail.com",
          pass: Email_otp_pass,
        },
      });
      var mailoption = {
        from: "wasimxaman13@gmail.com",
        to: email,
        subject: "Varify Email",
        text: `Varify Email OTP ${code}`,
      };
      transpoter.sendMail(mailoption, function (error, info) {
        if (error) {
          console.log(error);
          res.status(500).json({
            status: 500,
            success: false,
            message: "Failed to send OTP email",
            data: null,
          });
        } else {
          console.log("Email sent: " + info.response);
          res.status(201).json({
            status: 201,
            success: true,
            message: "please check your email",
            data: null,
          });
        }
      });
    }
  } catch (error) {
    // console.log(error);
    // res
    //   .status(400)
    //   .json({ status: 400, success: false, message: "not found", data: null });
    const err = new Error(error);
    err.status = 500;
    next(err);
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
        const registerEmp = new providerRegister({
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
    const useremail = await providerRegister.findOne({ email: email });
    const ismatch = await bcrypt.compare(password, useremail.password);

    if (!useremail || !password) {
      res.status(400).json({
        status: 400,
        message: "Enter Correct email or password",
        data: null,
      });
    } else if (ismatch) {
      const getmens = await providerRegister.findOneAndUpdate(
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
    const data = await providerRegister.findOne({ _id: _id }).select({
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
    const mail = await providerRegister.findOne({ email: email });
    if (!mail) {
      res.status(404).json({
        status: 400,
        success: false,
        message: "This email not exist",
        data: null,
      });
    } else {
      const random = generateOTP();
      console.log(random);
      const otpData = new EmailVarify({
        email: req.body.email,
        code: random,
        expireIn: new Date().getTime() + 60 * 10000,
      });
      var transpoter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: "wasimxaman13@gmail.com",
          pass: Email_otp_pass,
        },
      });
      var mailoption = {
        from: "wasimxaman13@gmail.com",
        to: email,
        subject: "sending email using nodejs",
        text: `Varify Email OTP ${random}`,
      };
      transpoter.sendMail(mailoption, function (error, info) {
        if (error) {
          console.log(error);
          res.status(500).json({
            status: 500,
            success: false,
            message: "Failed to send OTP email",
            data: null,
          });
        } else {
          console.log("Email sent: " + info.response);
          res.status(201).json({
            status: 201,
            success: true,
            message: "Send OTP successfully",
            data: null,
          });
        }
      });
      const varifyemail = await otpData.save();
      res.status(201).json({
        status: 201,
        success: true,
        message: "Send otp successfully",
        data: { Otp: random },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "internel Server error",
      data: null,
    });
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
    const mailVarify = await providerRegister.findOne({ email: email });
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

router.get("/admin/invitations/:adminId", adminController.getAdminInvitations);

router.put("/access", adminController.putAccess);

router.put("/access/response", adminController.invitationResponse);

// * Player * * * * * * * * * * * * * * * *

router.post("/add-players", upload.single("Image"), async (req, res, next) => {
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

    if (!name || !location || !role || !age) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "name location role age parameter is missing",
        data: null,
      });
    }

    const file = req.file;
    if (file) {
      ManuImage = `data:image/png;base64,${file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    }

    const MenuEmp = new Player({
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
    const savedPlayer = await MenuEmp.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Player has been added successfully",
      data: savedPlayer,
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
});
router.get("/get-player-detail-by-adminid/:admin", async (req, res, next) => {
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
});
router.post("/get-player-detail-by-playerid", async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const data = await Player.findOne({ _id: playerId });

    if (!data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found for this player ID",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player details",
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
router.delete("/delete-player-byid", async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const deletedPlayer = await Player.findByIdAndDelete(playerId);

    if (!deletedPlayer) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found",
        data: null,
      });
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
      console.log(result);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player deleted successfully",
      data: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
});
router.put("/update-player", upload.single("Image"), async (req, res, next) => {
  try {
    const productId = req.body.playerId;
    const { name, location, role, age, additionalInfo, admins } = req.body;
    const existingProduct = await Player.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found",
        data: null,
      });
    }
    let ManuImage = null;
    if (req.file) {
      ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    } else {
      ManuImage = existingProduct.Image;
    }
    existingProduct.name = name;
    existingProduct.location = location;
    existingProduct.role = role;
    existingProduct.age = age;
    existingProduct.additionalInfo = additionalInfo;
    existingProduct.admins = admins;
    existingProduct.Image = ManuImage;
    const updatedProduct = await existingProduct.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: "Player updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
});
router.post("/get-other-admin-by-adminid", async (req, res, next) => {
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
    const data = await providerRegister.find(query).skip(skip).limit(limit);

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
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      data: [],
    });
  }
});
router.put("/share-player", async (req, res, next) => {
  try {
    const playerId = req.body.playerId;
    const adminId = req.body.adminId;
    const newAdmins = req.body.newAdmins;

    // Check if the requesting admin is not blocked
    const checkAdmin = await providerRegister.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "This admin is either not found or blocked",
        data: null,
      });
    }

    const player = await Player.findOne({ _id: playerId, admins: adminId });

    if (!player) {
      return res.status(404).json({
        status: 404,
        success: false,
        message:
          "Player not found for this player ID or you are not an admin of this player",
        data: null,
      });
    }

    if (Array.isArray(newAdmins) && newAdmins.length > 0) {
      for (const newAdminId of newAdmins) {
        if (!player.admins.includes(newAdminId)) {
          player.admins.push(newAdminId);
        } else {
          return res.status(400).json({
            status: 400,
            success: false,
            message: `Admin with ID ${newAdminId} already exists for this player`,
            data: null,
          });
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
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
});

// * Team * * * * * * * * * * * * * * * * *
router.post("/add-team", upload.single("image"), async (req, res, next) => {
  try {
    const { name, location, admin, players } = req.body;
    const playerID = Array.isArray(players)
      ? players.map((id) => mongoose.Types.ObjectId(id))
      : [];

    const adminIDs = Array.isArray(admin)
      ? admin.map((id) => mongoose.Types.ObjectId(id))
      : [];
    let ManuImage = null;

    if (!name || !location) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "name location parameter is missing",
        data: null,
      });
    }

    const file = req.file;
    if (file) {
      ManuImage = `data:image/png;base64,${file.buffer.toString("base64")}`;

      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    }

    const MenuEmp = new Team({
      name: name,
      location: location,
      admin: adminIDs,
      players: playerID,

      image: ManuImage,
    });
    const savedPlayer = await MenuEmp.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Team has been added successfully",
      data: savedPlayer,
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
});
router.post("/get-teams", async (req, res, next) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        status: 400,
        success: false,
        message: "adminId parameter is missing",
        data: null,
      });
    }

    // Find teams where admin matches adminId
    const teams = await Team.find({ admin: adminId })
      .populate("players", "-latestPerformance")
      .populate("admin");

    res.status(200).json({
      status: 200,
      success: true,
      message: "Teams fetched successfully",
      data: teams,
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
});
router.put("/update-team", upload.single("image"), async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const { name, location } = req.body;
    const existingProduct = await Team.findById({ _id: teamID });
    if (!existingProduct) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Team not found",
        data: null,
      });
    }
    let ManuImage = null;
    if (req.file) {
      ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    } else {
      ManuImage = existingProduct.image;
    }
    existingProduct.name = name;
    existingProduct.location = location;
    existingProduct.image = ManuImage;
    const updatedProduct = await existingProduct.save();
    res.status(200).json({
      status: 200,
      success: true,
      message: "Team updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
});
router.delete("/delete-team-byid", async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const deletedPlayer = await Team.findByIdAndDelete({ _id: teamID });

    if (!deletedPlayer) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "team not found",
        data: null,
      });
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
    console.error(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
});
router.put("/in-team-add-player", async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const adminId = req.body.adminId;
    const newPlayers = req.body.newPlayers;

    const checkAdmin = await providerRegister.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "This admin is either not found or blocked",
        data: null,
      });
    }

    const team = await Team.findOne({ _id: teamID, admin: adminId });

    if (!team) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Team not found for this team ID or you are not the admin",
        data: null,
      });
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
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
});
router.put("/share-team", async (req, res, next) => {
  try {
    const teamID = req.body.teamID;
    const adminId = req.body.adminId;
    const newAdmins = req.body.newAdmins;

    // Check if the requesting admin is not blocked
    const checkAdmin = await providerRegister.findOne({ _id: adminId });
    if (!checkAdmin || checkAdmin.status === 0) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "This admin is either not found or blocked",
        data: null,
      });
    }

    const team = await Team.findOne({ _id: teamID, admin: adminId });

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
        if (!team.admin.includes(newAdminId)) {
          team.admin.push(newAdminId);
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
});
router.get("/get-players-by-teamId/:teamID", async (req, res, next) => {
  try {
    const teamID = req.params.teamID;
    const data = await Team.find({ _id: teamID }).populate(
      "players",
      "name location role Image"
    );

    if (!data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Team not found for this Team ID",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Team details",
      data: data[0].players,
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
router.post("/create", async (req, res, next) => {
  const data = req.body;
  await matchDetails.add({ data });
  res.send({ msg: "User Added" });
});
router.get("/test", async (req, res, next) => {
  res.json({ testing: "TESTING" });
});

// * Match Details * * * * * * * * * * * * * * * * * * *
router.post("/add-match-details", adminController.postAddMatch);

router.put("/start-match/:matchId", adminController.postStartMatch);

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
          message: "MatchDetails not found for this MatchDetails ID",
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
router.get("/get-live-matches/:adminId", async (req, res, next) => {
  try {
    const adminId = req.params.adminId;
    const matches = await MatchDetails.find({
      admin: adminId,
      matchStatus: 1,
    })
      .select(
        "-striker -nonStriker -manOfTheMatch -openingBowler -playerStats -bowlerStats -currentOver -lastWicket -overs"
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
});
router.get("/get-matchesdetails/:matchId", async (req, res, next) => {
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
      .populate("lastWicket.player", "name -_id");

    if (!matches || matches.length === 0) {
      //   return res.status(404).json({
      //     status: 404,
      //     success: false,
      //     message: "No matches found for the current matchId.",
      //     data: null,
      //   });
      return next(new Error("No match found!"));
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Match details",
      data: matches,
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
router.put("/set-man-of-the-match", adminController.setManOfTheMatch);

// * Tournament matches * * * * * * * * * * * * * * * * * * *
router.post(
  "/tournament",
  upload.single("image"),
  validators.validateTournament,
  (req, res, next) => {
    adminController.postTournament(req, res, next, cloudinary);
  }
);

router.put(
  "/tournament/:id",
  upload.single("image"),
  validators.validateTournament,
  (req, res, next) => {
    adminController.updateTournament(req, res, next, cloudinary);
  }
);

router.get("/tournaments", adminController.getTournaments);

router.get("/tournament/:tournamentId", adminController.getTournament);

router.put("/team-to-tournament", adminController.putTeamToTournament);

router.delete("/team-to-tournament", adminController.deleteTeamFromTournament);

router.post(
  "/add-tournament-match",
  validators.validateTournamentMatch,
  adminController.addTournamentMatch
);

router.get("/tournament-upcoming/:id", adminController.getTournamentUpcoming);

module.exports = router;
