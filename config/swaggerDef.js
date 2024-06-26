// * ADMINS SECTION

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

/**
 * @swagger
 * /superadmin/api/admins:
 *   get:
 *     summary: Get a list of admins
 *     description: Retrieves a paginated list of admins.
 *     tags: [Admins]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: The page number for pagination.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: The number of records per page.
 *     responses:
 *       200:
 *         description: Admins fetched successfully.
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
 *                   example: Admins fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       email:
 *                         type: string
 *                         example: admin@example.com
 *                       status:
 *                         type: string
 *                         example: active
 *                       Phone:
 *                         type: string
 *                         example: "+123456789"
 *                       ProfileImage:
 *                         type: string
 *                         example: "https://example.com/profile.jpg"
 *                       fullname:
 *                         type: string
 *                         example: "John Doe"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-01-01T00:00:00Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-01-02T00:00:00Z"
 *       404:
 *         description: No Admins found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /superadmin/api/change-admin-status/{adminId}:
 *   put:
 *     summary: Change the status of an admin
 *     description: Updates the status of a specific admin by their ID.
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: adminId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the admin whose status is to be updated.
 *       - in: body
 *         name: body
 *         required: true
 *         description: The new status for the admin.
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: integer
 *               example: 0
 *               description: 0 for blocked, 1 for active
 *     responses:
 *       200:
 *         description: Admin status updated and notification sent successfully.
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
 *                   example: Admin status updated and notification sent successfully
 *                 data:
 *                   type: object
 *                   description: Updated admin object.
 *       400:
 *         description: Invalid status provided.
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */

/**
 * @swagger
 * /superadmin/api/admin/{adminId}:
 *   delete:
 *     summary: Delete an admin
 *     description: Deletes a specific admin by their ID.
 *     tags: [Admins]
 *     parameters:
 *       - in: path
 *         name: adminId
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the admin to be deleted.
 *     responses:
 *       200:
 *         description: Admin deleted successfully.
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
 *                   example: Admin deleted successfully
 *       404:
 *         description: Admin not found.
 *       500:
 *         description: Internal server error.
 */

// * NOTIFICATIONS SECTION

/**
 * @swagger
 * /superadmin/api/send-notification:
 *   post:
 *     summary: Send a notification to all users
 *     description: Sends a notification to all users with a specified title and body.
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the notification.
 *                 example: "New Announcement"
 *               body:
 *                 type: string
 *                 description: The body content of the notification.
 *                 example: "We have updated our terms of service."
 *     responses:
 *       200:
 *         description: Notifications sent successfully.
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
 *                   example: Notifications sent successfully
 *                 data:
 *                   type: object
 *                   additionalProperties: true
 *                   description: Response from the FCM service.
 *       404:
 *         description: No devices found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No devices found
 *       500:
 *         description: Failed to send notifications.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Failed to send notifications
 *                 error:
 *                   type: string
 *                   example: Detailed error message
 */

// * PLAYERS SECTION

/**
 * @swagger
 * /superadmin/api/players:
 *   get:
 *     summary: Retrieve a list of players
 *     description: Fetches a paginated list of players, optionally filtered by a search query, including the total number of players.
 *     tags: [Players]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         description: The page number to retrieve.
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         description: The number of players to retrieve per page.
 *         example: 10
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         required: false
 *         description: The search query to filter players by name.
 *         example: John
 *     responses:
 *       200:
 *         description: Players fetched successfully.
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
 *                   example: Players fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60d0fe4f5311236168a109ca
 *                       name:
 *                         type: string
 *                         example: Player Name
 *                       location:
 *                         type: string
 *                         example: Player Location
 *                       role:
 *                         type: string
 *                         example: Player Role
 *                       age:
 *                         type: integer
 *                         example: 25
 *                       additionalInfo:
 *                         type: string
 *                         example: Additional Info
 *                       Image:
 *                         type: string
 *                         example: https://example.com/player-image.png
 *                 totalPlayers:
 *                   type: integer
 *                   example: 100
 *       404:
 *         description: No players found.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: No players found
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Internal server error
 *                 error:
 *                   type: string
 *                   example: Detailed error message
 */

// * TEAMS SECTION

/**
 * @swagger
 * /superadmin/api/teams:
 *   get:
 *     summary: Get teams with pagination and search
 *     description: Retrieves a list of teams with pagination and optional search by name.
 *     tags: [Teams]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of teams per page
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for team names
 *     responses:
 *       200:
 *         description: Fetched teams successfully.
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
 *                   example: Fetched teams successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         example: 60c72b2f5f1b2c001c8e4a92
 *                       name:
 *                         type: string
 *                         example: Team A
 *                       players:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             name:
 *                               type: string
 *                               example: Player 1
 *                             location:
 *                               type: string
 *                               example: Location 1
 *                             role:
 *                               type: string
 *                               example: Batsman
 *                             age:
 *                               type: integer
 *                               example: 25
 *                             additionalInfo:
 *                               type: string
 *                               example: Additional info about the player
 *                             Image:
 *                               type: string
 *                               example: player1.jpg
 *                 totalTeams:
 *                   type: integer
 *                   example: 100
 *       404:
 *         description: No teams found.
 *       500:
 *         description: Internal server error.
 */

// * Counts Section

/**
 * @swagger
 * /superadmin/api/counts:
 *   get:
 *     summary: Get daily, weekly, and monthly viewers, total players, and total teams
 *     description: Retrieves the number of unique viewers for the current day, week, and month, along with the total number of players and teams.
 *     tags: [Counts]
 *     responses:
 *       200:
 *         description: Fetched viewers, total players, and total teams successfully.
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
 *                   example: Fetched viewers, total players, and total teams successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyViewers:
 *                       type: integer
 *                       example: 100
 *                     weeklyViewers:
 *                       type: integer
 *                       example: 500
 *                     monthlyViewers:
 *                       type: integer
 *                       example: 2000
 *                     totalPlayers:
 *                       type: integer
 *                       example: 3000
 *                     totalTeams:
 *                       type: integer
 *                       example: 150
 *       500:
 *         description: Internal server error.
 */
