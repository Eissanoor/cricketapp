const express = require("express");

const userController = require("../controllers/user.js");

const router = express.Router();

router.get("/get-live-matches-for-user", userController.getLiveMatches);

module.exports = router;
