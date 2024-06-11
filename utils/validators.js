const multer = require("multer");
const upload = multer();
const { body, validationResult } = require("express-validator");

// * TOURNAMENT ***
exports.validateTournament = [
  //   upload.none(),
  body("seriesName").notEmpty().withMessage("Series name is required"),
  body("seriesLocation").notEmpty().withMessage("Series location is required"),
  body("tournamentType").notEmpty().withMessage("Tournament type is required"),
  body("numberOfOvers")
    .isInt({ gt: 0 })
    .withMessage("Number of overs must be a positive integer"),
  body("numberOfTeams")
    .isInt({ gt: 0 })
    .withMessage("Number of teams must be a positive integer"),
  body("startDate").notEmpty().withMessage("Start date must be a valid date"),
  body("endDate").notEmpty().withMessage("End date must be a valid date"),
  (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];

// * MATCH ***
exports.validateStartMatch = [
  body("whoWinsTheToss")
    .notEmpty()
    .withMessage("Who wins the toss is required"),
  body("tossDetails").notEmpty().withMessage("Toss details are required"),
  body("matchStatus").isInt().withMessage("Match status must be an integer"),
  body("squad1").notEmpty().withMessage("Squad1 is required"),
  body("squad2").notEmpty().withMessage("Squad2 is required"),
  body("team1Batting")
    .isBoolean()
    .withMessage("Team1 batting must be a boolean"),
  body("team2Batting")
    .isBoolean()
    .withMessage("Team2 batting must be a boolean"),
  body("team1toss").isBoolean().withMessage("Team1 toss must be a boolean"),
  body("team2toss").isBoolean().withMessage("Team2 toss must be a boolean"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];
exports.validateTournamentMatch = [
  body("admin").notEmpty().withMessage("Admin is required"),
  body("team1").notEmpty().withMessage("Team1 is required"),
  body("team2").notEmpty().withMessage("Team2 is required"),
  body("matchType").notEmpty().withMessage("Match type is required"),
  body("ballType").notEmpty().withMessage("Ball type is required"),
  body("pitchType").notEmpty().withMessage("Pitch type is required"),
  body("numberOfOvers")
    .isInt({ gt: 0 })
    .withMessage("Number of overs must be a positive integer"),
  body("oversPerBowler")
    .isInt({ gt: 0 })
    .withMessage("Overs per bowler must be a positive integer"),
  body("cityOrTown").notEmpty().withMessage("City or town is required"),
  body("ground").notEmpty().withMessage("Ground is required"),
  body("matchDateTime")
    // .isISO8601()
    .isString()
    .withMessage("Match date time must be a valid ISO 8601 date"),
  body("tournamentId").notEmpty().withMessage("Tournament ID is required"),
  body("tournamentMatchType")
    .notEmpty()
    .withMessage("Tournament match type is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];

exports.validateMatch = [
  body("admin").notEmpty().withMessage("Admin is required"),
  body("team1").notEmpty().withMessage("Team1 is required"),
  body("team2").notEmpty().withMessage("Team2 is required"),
  body("matchType").notEmpty().withMessage("Match type is required"),
  body("ballType").notEmpty().withMessage("Ball type is required"),
  body("pitchType").notEmpty().withMessage("Pitch type is required"),
  body("numberOfOvers")
    .isInt({ gt: 0 })
    .withMessage("Number of overs must be a positive integer"),
  body("oversPerBowler")
    .isInt({ gt: 0 })
    .withMessage("Overs per bowler must be a positive integer"),
  body("cityOrTown").notEmpty().withMessage("City or town is required"),
  body("ground").notEmpty().withMessage("Ground is required"),
  body("matchDateTime")
    // .isISO8601()
    .notEmpty()
    .withMessage("Match date time is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];

// * TEAM ***
exports.validateTeam = [
  body("name").notEmpty().withMessage("Team name is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("admins").isArray().withMessage("Admins must be an array"),
  //   body("players").isArray().withMessage("Players must be an array"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];

// * PLAYER ***
exports.validatePlayer = [
  body("name").notEmpty().withMessage("Name is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("role").notEmpty().withMessage("Role is required"),
  //   body("age").isInt({ gt: 0 }).withMessage("Age must be a positive integer"),
  body("additionalInfo").notEmpty().withMessage("Additional info is required"),
  body("admins").isArray().withMessage("Admins must be an array"),
  //   body("sixes")
  //     .isInt({ gt: 0 })
  //     .withMessage("Sixes must be a positive integer"),
  //   body("fours")
  //     .isInt({ gt: 0 })
  //     .withMessage("Fours must be a positive integer"),
  //   body("wickets")
  //     .isInt({ gt: 0 })
  //     .withMessage("Wickets must be a positive integer"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];

exports.validateUpdatePlayer = [
  body("name").notEmpty().withMessage("Name is required"),
  body("location").notEmpty().withMessage("Location is required"),
  body("role").notEmpty().withMessage("Role is required"),
  //   body("age").isInt({ gt: 0 }).withMessage("Age must be a positive integer"),
  body("additionalInfo").notEmpty().withMessage("Additional info is required"),
  body("admins").isArray().withMessage("Admins must be an array"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const message = errors.array()[0].msg;
      const error = new Error(message);
      error.statusCode = 422;
      return next(error);
    }
    next();
  },
];
