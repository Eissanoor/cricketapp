var express = require("express");
const multer = require("multer");
const cors = require("cors");
const bodyparser = require("body-parser");
const bcrypt = require("bcrypt");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
require("./database/db");

// Cloudinary configuration
const { cloudinary, storage } = require("./config/cloudinary");

// Controllers
const scorerController = require("./controllers/scorer");
const adminController = require("./controllers/admin");

// Routes
const adminRouter = require("./router/admin");
const userRouter = require("./router/user");
const scorerRouter = require("./router/scorer");
const superAdminRouter = require("./router/super_admin");

// Schemas
const SuperAdmin = require("./models/super_admin");

// Assignments
var app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(bodyparser.urlencoded({ extended: true }));
const upload = multer({ storage: storage });
app.use(cors({ origin: "*" }));

// Middleware to ensure super admin exists
app.use(async (req, res, next) => {
  const email = "lalkhan@superadmin.com";
  const superAdminExists = await SuperAdmin.findOne({
    email: email,
  });
  if (!superAdminExists) {
    const password = await bcrypt.hash("lalkhan123", 12);
    const superAdmin = new SuperAdmin({
      name: "Lal Khan",
      email: email,
      password: password,
    });
    await superAdmin.save();
  }
  next();
});

// Example route for file upload (images and videos)
app.post("/upload", upload.single("media"), (req, res) => {
  if (req.file) {
    res.json({ mediaUrl: req.file.path });
  } else {
    res.status(400).json({ error: "File upload failed" });
  }
});

app.post("/set-openings", async (req, res, next) => {
  adminController.postSetOpenings(req, res, next, socketIo);
});
app.post("/action", (req, res, next) => {
  scorerController.postAction(req, res, next, socketIo);
});
app.put("/start-stop-match", (req, res, next) => {
  scorerController.putStopStartMatch(req, res, next, socketIo);
});

app.use(scorerRouter);
app.use(adminRouter);
app.use(userRouter);
app.use("/superadmin/api/", superAdminRouter);

app.use((req, res, next) => {
  const error = new Error(`No route found for ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message =
    error.message ||
    "An error occurred while trying to process your request. Please try again later.";
  const data = null;
  const success = false;
  res
    .status(status)
    .json({ message: message, status: status, success: success, data: data });
});

var swaggerUi = require("swagger-ui-express"),
  swaggerDocument = require("./swagger.json");
const ScoreCard = require("./models/score_card");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const PORT = process.env.PORT || 3002;
const serverssss = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const socketIo = require("socket.io")(serverssss, {
  pingTimeout: 2000,
  cors: {
    origin: "*",
  },
});
socketIo.on("connection", (socket) => {
  console.log("A user connected");
  socket.emit("message", "Hello from server");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
