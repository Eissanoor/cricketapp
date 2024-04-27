const express = require("express");

const userController = require("../controllers/user.js");

const router = express.Router();

router.get("/get-live-matches-for-user", userController.getLiveMatches);

router.get("/get-upcoming-matches-for-user", userController.getUpcomingMathces);

router.get(
  "/get-scorecards-for-match/:matchId",
  userController.getScoreCardsByMatchId
);

router.get("/get-all-balls-for-match/:matchId", userController.getMatchBalls);

module.exports = router;
