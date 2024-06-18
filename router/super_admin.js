const express = require("express");
const multer = require("multer");
const { storage } = require("../config/cloudinary");

const upload = multer({ storage: storage });
const sAdminController = require("../controllers/super_admin");

const router = express.Router();

/**
 * @swagger
 * /superadmin/api/login:
 *   post:
 *     summary: Login as a super admin
 *     description: Authenticates a super admin by their email and password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The super admin's email.
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 description: The super admin's password.
 *                 example: securePassword123
 *     responses:
 *       200:
 *         description: SuperAdmin logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: SuperAdmin logged in successfully
 *                 data:
 *                   type: object
 *                   description: Additional data (if any) related to the login.
 *       401:
 *         description: Unauthorized. Password does not match.
 *       404:
 *         description: No SuperAdmin found with this email.
 *       500:
 *         description: Internal server error.
 */
router.post("/login", sAdminController.login);

// * Admins Section ***

router.get("/admins", sAdminController.getAdmins);

router.put("/change-admin-status/:adminId", sAdminController.changeAdminStatus);

router.delete("/admin/:adminId", sAdminController.deleteAdmin);

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

router.post("/video", upload.single("video"), sAdminController.postVideo);

router.get("/videos", sAdminController.getVideos);

router.put(
  "/video/:videoId",
  upload.single("video"),
  sAdminController.putVideo
);

router.delete("/video/:videoId", sAdminController.deleteVideo);

router.put("/view-video", sAdminController.putViewVideo);

// * Players Section ***

router.get("/players", sAdminController.getPlayers);

router.put(
  "/player/:playerId",
  upload.single("Image"),
  sAdminController.putPlayer
);

router.delete("/player/:playerId", sAdminController.deletePlayer);

// * Teams Section ***

router.get("/teams", sAdminController.getTeams);

router.put("/team/:teamId", upload.single("image"), sAdminController.putTeam);

router.delete("/team/:teamId", sAdminController.deleteTeam);

// * Tournament Section ***

router.get("/tournaments", sAdminController.getTournaments);

router.put(
  "/tournament/:tournamentId",
  upload.single("image"),
  sAdminController.putTournament
);

router.delete("/tournament/:tournamentId", sAdminController.deleteTournament);

// * Matches Section ***
router.get("/matches", sAdminController.getMatches);

router.delete("/match/:id", sAdminController.deleteMatch);

// * Notification Section ***

router.post("/store-token", sAdminController.storeFcmToken);

router.post("/send-notification", sAdminController.sendNotification);

module.exports = router;
