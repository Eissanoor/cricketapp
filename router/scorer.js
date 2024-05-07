const express = require("express");

const scorerController = require("../controllers/scorer.js");

const router = express.Router();

router.put("/stop-match", (req, res, next) => {});

module.exports = router;
