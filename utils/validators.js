const multer = require("multer");
const upload = multer();
const { body, validationResult } = require("express-validator");

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
      let error = errors.array()[0].msg;
      return next(new Error(error));
    }
    next();
  },
];

exports.validateTournamentMatch = [
  body("admin").notEmpty().withMessage("Admin is required"),
  body("team1").notEmpty().withMessage("Team 1 is required"),
  body("team2").notEmpty().withMessage("Team 2 is required"),
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
    .notEmpty()
    .withMessage("Match date and time is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      let error = errors.array()[0].msg;
      return next(new Error(error));
    }
    next();
  },
];
