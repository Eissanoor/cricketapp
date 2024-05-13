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
