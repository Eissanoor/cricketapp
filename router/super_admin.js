const express = require("express");

const superAdminController = require("../controllers/super_admin");

const router = express.Router();

router.post("/login", superAdminController.login);

module.exports = router;
