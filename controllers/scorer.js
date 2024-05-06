const Ball = require("../model/ball");
const MatchDetails = require("../model/match_details");
const Player = require("../model/player");

const scorerHelper = require("../utils/scorer");

// * Actions handler
exports.action = async (req, res, next, socketIo) => {
  try {
    const { matchId, actionType, data } = req.body;

    const match = await MatchDetails.findById(matchId);
    if (!match) {
      return next(new Error("No match found"));
    }
    if (match.matchStatus > 1) {
      return next(
        new Error(
          "This match has been finished, you cannot perform any action on this match"
        )
      );
    }

    let crr, rrr;
    if (match.team1Batting) {
      crr = scorerHelper.calculateCurrentRunRate(
        match.team1Score,
        match.team2Overs
      );
      rrr = scorerHelper.calculateRequiredRunRate(
        match.team2Score,
        match.numberOfOvers - match.team2Overs
      );
      match.team1CurrentRunRate = crr;
      match.team1RequiredRunRate = rrr;
    } else {
      crr = scorerHelper.calculateCurrentRunRate(
        match.team2Score,
        match.team1Overs
      );
      rrr = scorerHelper.calculateRequiredRunRate(
        match.team1Score,
        match.numberOfOvers - match.team1Overs
      );
      match.team2CurrentRunRate = crr;
      match.team2RequiredRunRate = rrr;
    }
    await match.save();
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

      case "outPlayer":
        await exports.handleOutAction(matchId, data, socketIo);
        socketIo.emit("match-" + matchId);
        return res.status(200).json({
          success: true,
          message: "Player out successfully",
          status: 200,
          data: null,
        });

      case "byes-LegByes":
        await exports.handleByesAndLegByesAction(matchId, data, socketIo);
        socketIo.emit("match-" + matchId);
        return res.status(200).json({
          success: true,
          message: "Extra runs added successfully",
          status: 200,
          data: null,
        });

      case "no ball":
        await exports.handleNoBallAction(matchId, data);
        socketIo.emit("match-" + matchId);
        return res.status(200).json({
          success: true,
          message: "Extra runs for no ball added successfully",
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
    console.log(error);
    // error.message = "Something went wrong!";
    return next(error);
  }
};

// * Actions
exports.handleScoreAction = async (matchId, runsScored, socketIo) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId).populate("scorecard");

    const striker = await Player.findById(match.striker);
    const bowler = await Player.findById(match.openingBowler);

    const ballDesc = scorerHelper.describeBall(
      striker.name,
      bowler.name,
      runsScored
    );

    // Create a new Ball object
    const ball = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: runsScored,
      ballTo: bowler.name + " to " + striker.name,
      description: ballDesc,
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
      if (!match.partnership) {
        match.partnership = { runs: 0, balls: 0 };
      }
      match.partnership.runs += runsScored;
      //   match = await match.save();
    }

    // Update the match details with the new score
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
    } else {
      match.team2Score = battingTeamScore;
    }

    // Add the ball to the current over
    match = await scorerHelper.addBallToOver(match, ball);

    // Update player stats
    match = scorerHelper.updateBatsmanStats(match, runsScored, ball.isExtra);
    match = scorerHelper.updateBlowerStats(match, ball, ball.extraType);
    await scorerHelper.updateRealPlayerStats(
      match.striker,
      runsScored,
      ball.isExtra
    );

    let scorecard = await scorerHelper.handleStrikerScorecard(
      match,
      ball,
      null,
      undefined
    );
    await scorecard.save();
    scorecard = await scorerHelper.handleBowlerScorecard(match, ball);
    await scorecard.save();

    // Swap players if odd runs scored
    if (runsScored % 2 === 1) {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
    }

    // Call function to handle over completion
    await scorerHelper.handleOverCompletion(match, socketIo);

    // Call function to handle match completion
    if (match.finishMatch()) {
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }

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
    battingTeamScore += extraRuns + 1;

    // Update the match details with the new score and extras
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
      match.team2Extras += 1;
    } else {
      match.team2Score = battingTeamScore;
      match.team1Extras += 1;
    }
    const striker = await Player.findById(match.striker);
    const bowler = await Player.findById(match.openingBowler);

    // const ballDesc = scorerHelper.describeBall(striker.name, bowler.name, runsScored);
    // Create a new Ball object
    const extraBall = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: extraRuns + 1,
      isExtra: true,
      extraType: extraType,
      ballTo: striker.name + " to " + bowler.name,
      description: "A wide bowl with " + extraRuns + " extra runs",
    });

    // Save the ball object
    await extraBall.save();

    // Add the extra ball to the current over
    match = await scorerHelper.addBallToOver(match, extraBall);

    // Call function to handle match completion
    if (match.finishMatch()) {
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }

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

exports.handleOutAction = async (matchId, data, socketIo) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId);

    const striker = await Player.findById(match.striker);
    const nonStriker = await Player.findById(match.nonStriker);
    const bowler = await Player.findById(match.openingBowler);
    const fielder = await Player.findById(data.fielder);

    if (match.team1Batting) {
      match.team1Outs++;
    } else {
      match.team2Outs++;
    }

    // Create a new Ball object
    const ball = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: 0,
      ballTo: bowler.name + " to " + striker.name,
      description: scorerHelper.generateWicketMessage(
        data.wicketType,
        fielder === null ? null : fielder.name,
        bowler.name,
        data.playerIdOut.toString() === striker._id.toString()
          ? striker.name
          : nonStriker.name
      ),
      isWicket: true,
      wicketType: data.wicketType,
    });

    // Save the ball object
    await ball.save();

    // Fire a socket event to notify clients about the player getting out
    // socketIo.emit("playerOut", { matchId, data.playerIdOut });

    // Select a new player to replace the out player (You can implement your logic here)
    // Add the ball to the current over
    match = await scorerHelper.addBallToOver(match, ball);

    // Update player stats
    match = scorerHelper.updateBatsmanStats(match, 0, false);
    match = scorerHelper.updateBlowerStats(match, ball, ball.extraType);
    await scorerHelper.updateRealPlayerStats(match.striker, 0, ball.isExtra);

    let scorecard = await scorerHelper.handleStrikerScorecard(
      match,
      ball,
      data,
      undefined
    );
    await scorecard.save();
    scorecard = await scorerHelper.handleBowlerScorecard(match, ball);
    await scorecard.save();

    // add out player into the list of out players
    match.outPlayers.push(data.playerIdOut);

    // Mark the player as out
    if (match.striker.equals(data.playerIdOut)) {
      match.striker = data.newPlayerId; // Mark the striker as null
    } else if (match.nonStriker.equals(data.playerIdOut)) {
      match.nonStriker = data.newPlayerId; // Mark the non-striker as null
    }

    // reset partnership for the batsmen
    if (!match.partnership) {
      match.partnership = { runs: 0, balls: 0 };
    } else {
      match.partnership.runs = 0;
      match.partnership.balls = 0;
    }

    // Update the last wicket
    const playerIndex = match.playerStats.findIndex(
      (player) => player._id.toString() === data.playerIdOut.toString()
    );
    if (playerIndex !== -1) {
      match.lastWicket = data.playerStats[playerIndex];
    } else {
      match.lastWicket.player = data.playerIdOut;
    }

    // Call function to handle over completion
    await scorerHelper.handleOverCompletion(match, socketIo);

    // Call function to handle match completion
    if (match.finishMatch()) {
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    console.error("Error handling out action:", error);
    throw error;
  }
};

exports.handleNoBallAction = async (matchId, data) => {
  try {
    let { runsScored, extraType } = data;
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
    battingTeamScore += runsScored + 1;

    // Update the match details with the new score and extras
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
      match.team2Extras += 1;
    } else {
      match.team2Score = battingTeamScore;
      match.team1Extras += 1;
    }
    const striker = await Player.findById(match.striker);
    const bowler = await Player.findById(match.openingBowler);

    // Create a new Ball object
    const extraBall = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: runsScored + 1,
      isExtra: true,
      extraType: extraType,
      ballTo: striker.name + " to " + bowler.name,
      description: "A no bowl with " + runsScored + " extra runs",
    });

    // Save the ball object
    await extraBall.save();

    // Add the extra ball to the current over
    match = await scorerHelper.addBallToOver(match, extraBall);

    if (runsScored > 0) {
      // Update player stats
      match = scorerHelper.updateBatsmanStats(
        match,
        runsScored,
        extraBall.isExtra
      );
      match = scorerHelper.updateBlowerStats(
        match,
        extraBall,
        extraBall.extraType
      );
      await scorerHelper.updateRealPlayerStats(
        match.striker,
        runsScored,
        extraBall.isExtra
      );

      let scorecard = await scorerHelper.handleStrikerScorecard(
        match,
        extraBall,
        null,
        extraBall.extraType
      );
      await scorecard.save();
      scorecard = await scorerHelper.handleBowlerScorecard(match, extraBall);
      await scorecard.save();

      // Swap players if odd runs scored
      if (runsScored % 2 === 1) {
        const temp = match.striker;
        match.striker = match.nonStriker;
        match.nonStriker = temp;
      }
    }

    // Call function to handle match completion
    if (match.finishMatch()) {
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    throw error;
  }
};

exports.handleByesAndLegByesAction = async (matchId, data, socketIo) => {
  try {
    let { runsScored, extraType, noOrWide } = data;
    let ballDesc;

    // Find the match details
    let match = await MatchDetails.findById(matchId);

    // Check which team is batting
    let battingTeamScore;
    let extraRuns;
    if (match.team1Batting) {
      battingTeamScore = match.team1Score;
    } else {
      battingTeamScore = match.team2Score;
    }

    // check if ball is no ball or not
    if (noOrWide !== undefined && noOrWide !== null) {
      // Update the batting team's score with extra runs
      battingTeamScore += runsScored + 1;
      extraRuns = runsScored + 1;
    } else {
      battingTeamScore += runsScored;
      extraRuns = runsScored;
    }

    // Update the match details with the new score and extras
    if (match.team1Batting) {
      match.team1Score = battingTeamScore;
      match.team2Extras += extraRuns;
    } else {
      match.team2Score = battingTeamScore;
      match.team1Extras += extraRuns;
    }

    const striker = await Player.findById(match.striker);
    const bowler = await Player.findById(match.openingBowler);

    // Set ball description
    if (noOrWide !== null && noOrWide !== undefined) {
      ballDesc =
        "Extra runs scored: " +
        extraRuns +
        " (" +
        extraType +
        ") & (" +
        noOrWide +
        ")";
    } else {
      ballDesc = "Extra runs scored: " + extraRuns + " (" + extraType + ")";
    }

    // Create a new Ball object
    let ball = new Ball({
      match: matchId,
      bowler: match.openingBowler,
      batsman: match.striker,
      runsScored: extraRuns,
      isExtra: noOrWide !== null && noOrWide !== undefined ? true : false,
      extraType: extraType,
      ballTo: striker.name + " to " + bowler.name,
      description: ballDesc,
    });

    // Save the ball object
    ball = await ball.save();

    // Add the extra ball to the current over
    match = await scorerHelper.addBallToOver(match, ball);

    // Update player stats
    match = scorerHelper.updateBatsmanStats(match, 0, ball.isExtra);
    match = scorerHelper.updateBlowerStats(match, ball, ball.extraType);
    await scorerHelper.updateRealPlayerStats(
      match.striker,
      runsScored,
      ball.isExtra
    );

    let scorecard = await scorerHelper.handleStrikerScorecard(
      match,
      ball,
      null,
      noOrWide !== null || noOrWide !== undefined
        ? ball.extraType + " " + noOrWide
        : ball.extraType
    );
    await scorecard.save();
    scorecard = await scorerHelper.handleBowlerScorecard(match, ball);
    await scorecard.save();

    // Swap players if odd runs scored
    if (runsScored % 2 === 1) {
      const temp = match.striker;
      match.striker = match.nonStriker;
      match.nonStriker = temp;
    }

    // Call function to handle over completion
    await scorerHelper.handleOverCompletion(match, socketIo);

    // Call function to handle match completion
    if (match.finishMatch()) {
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }

    // Save the updated match details
    const updatedMatch = await match.save();

    return updatedMatch;
  } catch (error) {
    throw error;
  }
};
