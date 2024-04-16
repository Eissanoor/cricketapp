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
const ScoreCard = require("./model/score_card");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const MatchDetails = require("./model/match_details");
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

    // Validate input parameters

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
app.post("/action", async (req, res) => {
  try {
    const { matchId, actionType, data } = req.body;

    // Perform action based on the action type
    switch (actionType) {
      case "score":
        // Handle score action
        const updatedMatchScore = await handleScoreAction(
          matchId,
          data.runsScored
        );
        // Send real-time update using socket.io
        socketIo.emit("match-" + matchId, updatedMatchScore);
        return res.status(200).json({
          success: true,
          message: "Match score updated successfully.",
          status: 200,
          //   data: updatedMatchScore,
          data: null,
        });

      //   case "out":
      //     // Handle out action
      //     const updatedMatchOut = await handleOutAction(matchId, data.playerOut);
      //     // Send real-time update using socket.io
      //     socketIo.emit("match-" + matchId, updatedMatchOut);
      //     return res.status(200).json({
      //       success: true,
      //       message: "Player out updated successfully.",
      //       status: 200,
      //       data: updatedMatchOut,
      //     });

      //   case "extras":
      //     // Handle extras action
      //     const updatedMatchExtras = await handleExtrasAction(
      //       matchId,
      //       data.extraRuns
      //     );
      //     // Send real-time update using socket.io
      //     socketIo.emit("match-" + matchId, updatedMatchExtras);
      //     return res.status(200).json({
      //       success: true,
      //       message: "Extra runs added successfully.",
      //       status: 200,
      //       data: updatedMatchExtras,
      //     });

      // Add more cases for other action types as needed

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid action type.",
          status: 400,
          data: null,
        });
    }
  } catch (error) {
    console.error("Error handling action:", error);
    return res.status(500).json({
      success: false,
      message: "Error while processing the action.",
      status: 500,
      data: null,
    });
  }
});
const handleScoreAction = async (matchId, runsScored, isExtra, extraType) => {
  try {
    // Find the match details
    const match = await MatchDetails.findById(matchId);

    // Create a new Ball object
    const ball = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: runsScored,
      isExtra: isExtra,
      extraType: extraType,
    });

    // Save the ball object
    await ball.save();

    // Update scorecard
    let scorecard = await ScoreCard.findOne({
      match: matchId,
      innings: match.currentInning.number,
      battingTeam: match.team1Batting ? match.team1 : match.team2,
      bowlingTeam: match.team1Batting ? match.team2 : match.team1,
    });

    // If scorecard doesn't exist, create a new one
    if (!scorecard) {
      scorecard = new ScoreCard({
        match: matchId,
        innings: match.currentInning.number,
        battingTeam: match.currentInning.battingTeam,
        bowlingTeam: match.currentInning.bowlingTeam,
        batsmen: [], // Required parameter
        bowlers: [], // Required parameter
      });
    }

    // Update batsman's statistics
    const strikerIndex = scorecard.batsmen.findIndex(
      (batsman) => batsman.player.toString() === match.striker.toString()
    );
    if (strikerIndex !== -1) {
      scorecard.batsmen[strikerIndex].runs += runsScored;
      // Update other batting statistics as needed
    }

    // Update bowler's statistics
    const bowlerIndex = scorecard.bowlers.findIndex(
      (bowler) => bowler.player.toString() === match.openingBowler.toString()
    );
    if (bowlerIndex !== -1) {
      scorecard.bowlers[bowlerIndex].overs += 0.1; // Assuming 1 ball per over
      scorecard.bowlers[bowlerIndex].runsGiven += runsScored;
      // Update other bowling statistics as needed
    }

    // Save the updated scorecard
    await scorecard.save();

    // Remaining logic for updating match details and emitting events...
  } catch (error) {
    console.error("Error handling score action:", error);
    throw error;
  }
};

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
