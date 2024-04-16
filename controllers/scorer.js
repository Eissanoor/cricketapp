const Ball = require("../model/ball");
const MatchDetails = require("../model/match_details");

exports.action = async (req, res, next, socketIo) => {
  try {
    const { matchId, actionType, data } = req.body;

    // Perform action based on the action type
    switch (actionType) {
      case "score":
        // Handle score action
        const updatedMatchScore = await exports.handleScoreAction(
          matchId,
          data.runsScored,
          socketIo
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

      case "extras":
        // Handle extras action
        const updatedMatchExtras = await exports.handleExtrasAction(
          matchId,
          data.extraRuns,
          data.extraType,
          socketIo
        );
        // Send real-time update using socket.io
        socketIo.emit("match-" + matchId, updatedMatchExtras);
        return res.status(200).json({
          success: true,
          message: "Extra runs added successfully.",
          status: 200,
          //   data: updatedMatchExtras,
          data: null,
        });

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
};
exports.handleOverCompletion = (match, socketIo) => {
  // Count the valid balls in the current over
  const validBallsInCurrentOver = match.currentOver.balls.filter(
    (ballId) => ballId.isExtra === false
  );

  // Check if the over is completed
  if (validBallsInCurrentOver.length === 6) {
    // Emit over event via web sockets
    socketIo.emit("overCompleted", {
      matchId: match._id,
      overNumber: match.currentOver.number,
    });

    // Reset balls array for the current over
    match.currentOver.balls = [];
    // Update current over number
    match.currentOver.number += 1;

    // Update striker and non-striker for the next over
    const temp = match.striker;
    match.striker = match.nonStriker;
    match.nonStriker = temp;

    // Update bowler for the next over
    // Logic to select the next bowler can be added here

    // Reset other over-related details if needed
  }
};
exports.handleScoreAction = async (matchId, runsScored, socketIo) => {
  try {
    // Find the match details
    const match = await MatchDetails.findById(matchId);

    // Create a new Ball object
    const ball = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: runsScored,
    });

    // Save the ball object
    await ball.save();

    // Check which team is batting
    let battingTeamScore;
    if (match.team1Batting) {
      battingTeamScore = match.team1Score;
    } else {
      battingTeamScore = match.team2Score;
    }

    // Update the batting team's score
    if (runsScored > 0) {
      battingTeamScore += runsScored;
    }

    // Update the match details with the new score
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
    } else {
      match.team2Score = battingTeamScore;
    }

    // Add the ball to the current over
    match.currentOver.balls.push(ball._id);

    // Update player stats
    const strikerStatsIndex = match.playerStats.findIndex(
      (playerStat) => playerStat.player.toString() === match.striker.toString()
    );

    // Update striker's stats
    if (strikerStatsIndex === -1) {
      // Create a new player stats
      const newStrikerStats = {
        player: match.striker,
        ballsFaced: 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100, // Since ballsFaced is 1, strikeRate is same as runsScored * 100
        // Initialize other stats as needed
      };

      // Add the new player stats to the playerStats array
      match.playerStats.push(newStrikerStats);
    } else {
      match.playerStats[strikerStatsIndex].ballsFaced++;
      match.playerStats[strikerStatsIndex].runs += runsScored;
      if (runsScored === 6) {
        match.playerStats[strikerStatsIndex].sixes++;
      } else if (runsScored === 4) {
        match.playerStats[strikerStatsIndex].fours++;
      }
      // Update the strike rate
      match.playerStats[strikerStatsIndex].strikeRate =
        (match.playerStats[strikerStatsIndex].runs /
          match.playerStats[strikerStatsIndex].ballsFaced) *
        100;
    }

    // Swap players if odd runs scored
    if (runsScored % 2 === 1) {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
    }

    // Call function to handle over completion
    exports.handleOverCompletion(match, socketIo);

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    console.error("Error handling score action:", error);
    throw error;
  }
};

exports.handleExtrasAction = async (
  matchId,
  extraRuns,
  extraType,
  socketIo
) => {
  try {
    // Find the match details
    const match = await MatchDetails.findById(matchId);

    // Check which team is batting
    let battingTeamScore;
    if (match.team1Batting) {
      battingTeamScore = match.team1Score;
    } else {
      battingTeamScore = match.team2Score;
    }

    // Update the batting team's score with extra runs
    battingTeamScore += extraRuns;

    // Update the match details with the new score and extras
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
      if (
        extraType === "byes" ||
        extraType === "legbyes" ||
        extraType === "wides" ||
        extraType === "noballs"
      ) {
        match.team2Extras += extraRuns; // Assuming team2 is fielding
      }
    } else {
      match.team2Score = battingTeamScore;
      if (
        extraType === "byes" ||
        extraType === "legbyes" ||
        extraType === "wides" ||
        extraType === "noballs"
      ) {
        match.team1Extras += extraRuns; // Assuming team1 is fielding
      }
    }

    // Create a new Ball object
    const extraBall = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: extraRuns,
      isExtra: true,
      extraType: extraType,
    });

    // Save the ball object
    await extraBall.save();

    // Add the extra ball to the current over
    match.currentOver.balls.push(extraBall._id);

    // Update striker's stats for wides and no balls
    if (extraType === "wides" || extraType === "noballs") {
      const strikerStatsIndex = match.playerStats.findIndex(
        (playerStat) =>
          playerStat.player.toString() === match.striker.toString()
      );
      if (strikerStatsIndex !== -1) {
        match.playerStats[strikerStatsIndex].runs += extraRuns;
        if (extraRuns === 4 || extraRuns === 6) {
          match.playerStats[strikerStatsIndex].fours += extraRuns === 4 ? 1 : 0;
          match.playerStats[strikerStatsIndex].sixes += extraRuns === 6 ? 1 : 0;
        }
      }
    }

    // Call function to handle over completion
    exports.handleOverCompletion(match, socketIo);

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    console.error("Error handling extras action:", error);
    throw error;
  }
};
