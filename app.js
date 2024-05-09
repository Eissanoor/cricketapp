var express = require("express");
const multer = require("multer");
const cors = require("cors");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
require("./database/db");

// Controllers
const scorerController = require("./controllers/scorer");
const adminController = require("./controllers/admin");

// Routes
const adminRouter = require("./router/admin");
const userRouter = require("./router/user");
const scorerRouter = require("./router/scorer");

// Assignments
var app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(cors());

// Middlewares
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

app.use((error, req, res, next) => {
  const status = error.statusCode || 500;
  const message = error.message || "Internal server error";
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
