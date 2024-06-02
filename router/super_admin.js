const express = require("express");

const superAdminController = require("../controllers/super_admin");

const router = express.Router();

router.post("/login", superAdminController.login);

// * Admins section ***
router.get("/admins", superAdminController.getAdmins);

router.put(
  "/toggle-admin-status/:adminId",
  superAdminController.toggleAdminStatus
);

module.exports = router;
