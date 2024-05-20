const express = require("express");

const userController = require("../controllers/user.js");

const router = express.Router();

// * MATCHES *
router.get("/get-live-matches-for-user", userController.getLiveMatches);

router.get("/get-upcoming-matches-for-user", userController.getUpcomingMathces);

router.get("/get-scorecards-for-match/:matchId", userController.getScoreCards);

router.get("/get-overs-for-match/:matchId", userController.getMatchOvers);

router.get("/get-completed-matches", userController.getCompletedMatches);

router.get("/get-banner-matches", userController.getBannerMatches);

// * PLAYER *
router.get("/player-details/:playerId", userController.getPlayerDetails);

module.exports = router;
