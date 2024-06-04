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

router.put("/view-news", sAdminController.putViewNews);

// * Social Link Section ***

router.post("/sociallink", sAdminController.postSocialLink);

router.get("/sociallinks", sAdminController.getSocialLinks);

router.put("/sociallink/:id", sAdminController.putSocialLink);

router.delete("/sociallink/:id", sAdminController.deleteSocialLink);

// * Reports Section ***
router.post("/report", sAdminController.postReport);

router.get("/reports", sAdminController.getReports);

router.delete("/report/:id", sAdminController.deleteReport);

// * Videos Section ***

router.post(
  "/video",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  sAdminController.postVideo
);

router.get("/videos", sAdminController.getVideos);

router.put(
  "/video/:videoId",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  sAdminController.putVideo
);

router.delete("/video/:videoId", sAdminController.deleteVideo);

module.exports = router;
