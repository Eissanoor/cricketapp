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
