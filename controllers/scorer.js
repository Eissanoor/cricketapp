const Ball = require("../model/ball");
const MatchDetails = require("../model/match_details");
const ScoreCard = require("../model/score_card");

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

      case "wide":
        // Handle extras action
        const updatedMatchWide = await exports.handleWideAction(
          matchId,
          data.extraRuns,
          data.extraType,
          socketIo
        );
        // Send real-time update using socket.io
        socketIo.emit("match-" + matchId, updatedMatchWide);
        return res.status(200).json({
          success: true,
          message: "Wide runs added successfully.",
          status: 200,
          data: updatedMatchWide,
          //   data: null,
        });

      case "swap":
        await exports.handlePlayerSwap(matchId);
        socketIo.emit("match-" + matchId);
        return res.status(200).json({
          success: true,
          message: "Successfully swapped players",
          status: 200,
          data: null,
        });

      case "changeBowler":
        await exports.changeBowler(matchId, data.newBowler);
        socketIo.emit("match-" + matchId);
        return res.status(200).json({
          success: true,
          message: "Successfully changed bowler",
          status: 200,
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
const handleStrikerScorecard = async (match, ball) => {
  const scorecard = await ScoreCard.findById(match.scorecard);
  const strikerScorecardIndex = scorecard.batsmen.findIndex(
    (card) => card.player.toString() === match.striker.toString()
  );

  if (strikerScorecardIndex === -1) {
    // Create a new scorecard for the striker
    const newScorecard = {
      player: match.striker,
      runs: ball.runsScored,
      ballsFaced: 1,
      fours: ball.runsScored === 4 ? 1 : 0,
      sixes: ball.runsScored === 6 ? 1 : 0,
      strikeRate: ball.runsScored * 100, // Since ballsFaced is 1, strikeRate is same as ball.runsScored * 100
    };
    scorecard.batsmen.push(newScorecard);
  } else {
    // Update the existing scorecard for the striker
    scorecard.batsmen[strikerScorecardIndex].runs += ball.runsScored;
    scorecard.batsmen[strikerScorecardIndex].ballsFaced++;
    if (ball.runsScored === 4) {
      scorecard.batsmen[strikerScorecardIndex].fours++;
    } else if (ball.runsScored === 6) {
      scorecard.batsmen[strikerScorecardIndex].sixes++;
    }
    // Update the strike rate
    scorecard.batsmen[strikerScorecardIndex].strikeRate =
      (scorecard.batsmen[strikerScorecardIndex].runs /
        scorecard.batsmen[strikerScorecardIndex].ballsFaced) *
      100;
  }
  return scorecard;
};
const handleOverCompletion = async (match, socketIo) => {
  // Populate the balls array in currentOver
  const matchWithPopulatedBalls = await MatchDetails.findById(
    match._id
  ).populate("currentOver.balls");

  // Filter the balls where isExtra is false
  const validBallsInCurrentOver =
    matchWithPopulatedBalls.currentOver.balls.filter(
      (ball) => ball.isExtra === false
    );

  // Check if the over is completed
  if (validBallsInCurrentOver.length >= 5) {
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
const addBallToOver = function (match, ball) {
  // Add the ball to the current over
  match.currentOver.balls.push(ball._id);

  // Find the current over
  let currentOver = match.overs.find(
    (over) => over.number === match.currentOver.number
  );

  if (currentOver) {
    // If the current over exists, add the ball to it
    currentOver.balls.push(ball._id);
  } else {
    // If the current over doesn't exist, create a new over and add the ball to it
    currentOver = {
      number: match.currentOver.number,
      balls: [ball._id],
    };
    match.overs.push(currentOver);
  }

  return match;
};

exports.handleScoreAction = async (matchId, runsScored, socketIo) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId).populate("scorecard");

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
    match = addBallToOver(match, ball);

    let scorecard = await handleStrikerScorecard(match, ball);

    await scorecard.save();

    // Swap players if odd runs scored
    if (runsScored % 2 === 1) {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
    }

    // Call function to handle over completion
    await handleOverCompletion(match, socketIo);

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    console.error("Error handling score action:", error);
    throw error;
  }
};

exports.handleWideAction = async (matchId, extraRuns, extraType, socketIo) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId);

    // Check which team is batting
    let battingTeamScore;
    if (match.team1Batting) {
      battingTeamScore = match.team1Score;
    } else {
      battingTeamScore = match.team2Score;
    }

    // Update the batting team's score with extra runs
    battingTeamScore += extraRuns + 1; // 1 for wide, extra runs for 4 lets say

    // Update the match details with the new score and extras
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
      match.team2Extras += 1;
    } else {
      match.team2Score = battingTeamScore;
      match.team1Extras += 1;
    }

    // Create a new Ball object
    const extraBall = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: extraRuns + 1, // 1 for wide, extra runs as well
      isExtra: true,
      extraType: extraType,
    });

    // Save the ball object
    await extraBall.save();

    // Add the extra ball to the current over
    match = addBallToOver(match, extraBall);

    // Call function to handle over completion
    // await handleOverCompletion(match, socketIo);

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    throw error;
  }
};

exports.handlePlayerSwap = async (matchId) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId);

    // Swap players
    const temp = match.striker;
    match.striker = match.nonStriker;
    match.nonStriker = temp;

    // Update the schema
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    console.error("Error handling extras action:", error);
    throw error;
  }
};

exports.changeBowler = async (matchId, newBowler) => {
  try {
    const match = await MatchDetails.findById(matchId);
    if (!match) {
      throw new Error("No match found");
    }

    // change the bowler
    match.openingBowler = newBowler;

    const updatedMatch = await match.save();
    return updatedMatch;
  } catch (err) {
    throw err;
  }
};
