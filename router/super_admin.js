const express = require("express");
const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage: storage });
const sAdminController = require("../controllers/super_admin");

const router = express.Router();

router.post("/login", sAdminController.login);

// * Admins Section ***

router.get("/admins", sAdminController.getAdmins);

router.put("/change-admin-status/:adminId", sAdminController.changeAdminStatus);

// * News Section ***

router.post("/news", upload.single("image"), sAdminController.postNews);

router.get("/news", sAdminController.getNews);

router.put("/news/:newsId", upload.single("image"), sAdminController.putNews);

router.delete("/news/:newsId", sAdminController.deleteNews);

// * Videos Section ***

module.exports = router;
