var express = require("express");
const multer = require("multer");
const cors = require("cors");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
require("./database/db");

// Controllers
const admin = require("./router/admin");
const scorerController = require("./controllers/scorer");

// Routes
const userRouter = require("./router/user");

// Schemas
const MatchDetails = require("./model/match_details");

var app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
app.use(cors());

// * Live Match Section
app.post("/set-openings", async (req, res, next) => {
  try {
    const { matchId, teamBatting, openingBatsmen, openingBowler } = req.body;

    // Update match details with opening batsmen and bowler for the specified inning
    const match = await MatchDetails.findById(matchId);

    // Update openings based on the team batting
    if (teamBatting === match.team1) {
      match.striker = openingBatsmen[0];
      match.nonStriker = openingBatsmen[1];
      match.openingBowler = openingBowler;
    } else {
      match.striker = openingBatsmen[0];
      match.nonStriker = openingBatsmen[1];
      match.openingBowler = openingBowler;
    }

    // start the second inning
    if (
      match.currentInning.number == 2 &&
      match.currentInning.started == false
    ) {
      match.currentInning.started = true;
      match = await match.save();
    }

    let scorecard = await ScoreCard.findOne({
      match: match._id,
      innings: match.currentInning.number,
    });

    if (!scorecard) {
      scorecard = new ScoreCard({
        match: match._id,
        battingTeam: teamBatting === match.team1 ? match.team1 : match.team2,
        bowlingTeam: teamBatting === match.team1 ? match.team2 : match.team1,
        batsmen: [{ player: openingBatsmen[0] }],
        bowlers: [{ player: openingBowler }],
        innings: match.currentInning.number,
      });
      await scorecard.save();

      match.scorecard.push(scorecard);
    }

    const matchstart = await match.save();

    // Send real-time update using socket.io
    socketIo.emit("match-" + matchId, matchstart);
    res.status(200).json({
      success: true,
      message: "Opening batsmen and bowler set successfully.",
      status: 200,
      data: null,
    });
  } catch (error) {
    // throw error for error handling middleware
    // error.message = "Error while setting opening batsmen and bowler.";
    return next(error);
  }
});
app.post("/action", (req, res, next) => {
  scorerController.action(req, res, next, socketIo);
});

app.use(admin);
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
const ScoreCard = require("./model/score_card");
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
