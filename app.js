var express = require("express");
var app = express();
const multer = require("multer");
const cors = require("cors");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
require("./database/db");
var admin = require("./router/admin");
const Player = require("./model/player");
const Ball = require("./model/ball");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const MatchDetails = require("./model/match_details");

const scorerController = require("./controllers/scorer");
// app.use(cors());
// app.use(cors({
//   origin: 'http://localhost:3000',
// }));
// const http = require("http");
// const http = require("http");
// const socketIo = require("socket.io");
app.use(cors());
// const server = http.createServer(app);
// const io = socketIo(server);

// io.on("connection", (socket) =>
// {
//   console.log("A user connected");
//   socket.emit("message", "Hello from server");
//   socket.on("disconnect", () =>
//   {
//     console.log("User disconnected");
//   });
// });

// Enable CORS for the specific Socket.IO route
// app.use("/socket.io", cors(), (req, res, next) =>
// {
//   next();
// });

app.post("/get-player-detail-by-playerid-socket", async (req, res) => {
  try {
    const playerId = req.body.playerId;
    const data = await Player.findOne({ _id: playerId });

    if (!data) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found for this player ID",
        data: null,
      });
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Player details",
      data: data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
      data: null,
    });
  }
});
app.put("/update-player-socket", upload.single("Image"), async (req, res) => {
  try {
    const productId = req.body.playerId;
    const { name, location, role, age, additionalInfo, admins } = req.body;
    const existingProduct = await Player.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Player not found",
        data: null,
      });
    }
    let ManuImage = null;
    if (req.file) {
      ManuImage = `data:image/png;base64,${req.file.buffer.toString("base64")}`;
      const result = await cloudinary.uploader.upload(ManuImage);
      ManuImage = result.url;
    } else {
      ManuImage = existingProduct.Image;
    }
    existingProduct.name = name;
    existingProduct.location = location;
    existingProduct.role = role;
    existingProduct.age = age;
    existingProduct.additionalInfo = additionalInfo;
    existingProduct.admins = admins;
    existingProduct.Image = ManuImage;
    const updatedProduct = await existingProduct.save();
    socketIo.emit("playerUpdated", updatedProduct);
    res.status(200).json({
      status: 200,
      success: true,
      message: "Player updated successfully",
      data: updatedProduct,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Internal Server Error",
      data: null,
    });
  }
});

// * Live Match Section
app.post("/set-openings", async (req, res) => {
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

    let scorecard = await ScoreCard.findOne({ match: match._id });

    if (!scorecard) {
      scorecard = new ScoreCard({
        match: match._id,
        battingTeam: teamBatting === match.team1 ? match.team1 : match.team2,
        bowlingTeam: teamBatting === match.team1 ? match.team2 : match.team1,
        batsmen: [{ player: openingBatsmen[0] }],
        bowlers: [{ player: openingBowler }],
        innings: match.currentInning,
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
    error.message = "Error while setting opening batsmen and bowler.";
    return next(error);
  }
});
app.post("/action", (req, res, next) => {
  scorerController.action(req, res, next, socketIo);
});

app.use(admin);
app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
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
