const Ball = require("../model/ball");
const MatchDetails = require("../model/match_details");
const ScoreCard = require("../model/score_card");
const Player = require("../model/player");
const Over = require("../model/over");

// Run rates

// Function to calculate current run rate
const calculateCurrentRunRate = (totalRuns, totalOvers) => {
  return (totalRuns / totalOvers).toFixed(2);
};
// Function to calculate required run rate
const calculateRequiredRunRate = (targetRuns, remainingOvers) => {
  return (targetRuns / remainingOvers).toFixed(2);
};
// Function to calculate net run rate
const calculateNetRunRate = (
  teamRuns,
  teamOvers,
  opponentRuns,
  opponentOvers
) => {
  const teamRunRate = teamOvers > 0 ? teamRuns / teamOvers : 0;
  const opponentRunRate = opponentOvers > 0 ? opponentRuns / opponentOvers : 0;
  return (teamRunRate - opponentRunRate).toFixed(2);
};

const handleStrikerScorecard = async (match, ball, data, extraType) => {
  let scorecard = await ScoreCard.findOne({ match: match._id });
  // Out blayer scorecard
  if (data != null || data != undefined) {
    const batsmanScorecardIndex = scorecard.batsmen.findIndex(
      (card) => card.player.toString() === data.playerIdOut.toString()
    );

    if (batsmanScorecardIndex === -1) {
      // Create a new scorecard for the striker
      const newScorecard = {
        player: data.playerIdOut,
        runs: ball.runsScored,
        ballsFaced: 1,
        fours: ball.runsScored === 4 ? 1 : 0,
        sixes: ball.runsScored === 6 ? 1 : 0,
        strikeRate: ball.runsScored * 100,
        dismissal: {
          type: data.wicketType,
          outBy: match.openingBowler,
          fielder: data.fielder,
        },
      };
      scorecard.batsmen.push(newScorecard);
    } else {
      // update dismisser
      scorecard.batsmen[batsmanScorecardIndex].dismissal.type = data.wicketType;
      scorecard.batsmen[batsmanScorecardIndex].dismissal.outBy =
        match.openingBowler;
      scorecard.batsmen[batsmanScorecardIndex].dismissal.fielder = data.fielder;
      // Update the existing scorecard for the striker
      scorecard.batsmen[batsmanScorecardIndex].ballsFaced++;

      // Update the strike rate
      scorecard.batsmen[batsmanScorecardIndex].strikeRate =
        (scorecard.batsmen[batsmanScorecardIndex].runs /
          scorecard.batsmen[batsmanScorecardIndex].ballsFaced) *
        100;
    }
    return scorecard;
  }

  // * We have three situations, byes leg byes, no wide ball, score ball
  const strikerScorecardIndex = scorecard.batsmen.findIndex(
    (card) => card.player.toString() === match.striker.toString()
  );

  if (strikerScorecardIndex === -1) {
    // Create a new scorecard for the striker
    let newScorecard;
    if (extraType === undefined) {
      newScorecard = {
        player: match.striker,
        runs: ball.runsScored,
        ballsFaced: 1,
        fours: ball.runsScored === 4 ? 1 : 0,
        sixes: ball.runsScored === 6 ? 1 : 0,
        strikeRate: ball.runsScored * 100,
      };
    } else if (extraType === "no ball" || extraType === "wide") {
      newScorecard = {
        player: match.striker,
        runs: ball.runsScored,
        ballsFaced: 0,
        fours: ball.runsScored >= 4 ? 1 : 0,
        sixes: ball.runsScored >= 5 ? 1 : 0,
        strikeRate: ball.runsScored * 100,
      };
    } else if (extraType === "byes" || extraType === "leg byes") {
      newScorecard = {
        player: match.striker,
        runs: 0,
        ballsFaced: 1,
        fours: 0,
        sixes: 0,
        strikeRate: ball.runsScored * 100,
      };
    }

    scorecard.batsmen.push(newScorecard);
  } else {
    // Update the existing scorecard for the striker
    if (extraType === undefined) {
      scorecard.batsmen[strikerScorecardIndex].runs += ball.runsScored;
    }

    if (extraType != "wide" || extraType != "no ball") {
      scorecard.batsmen[strikerScorecardIndex].ballsFaced++;
    }

    if (extraType === undefined || extraType === "no ball") {
      if (ball.runsScored >= 4) {
        scorecard.batsmen[strikerScorecardIndex].fours++;
      } else if (ball.runsScored >= 6) {
        scorecard.batsmen[strikerScorecardIndex].sixes++;
      }
    }
    // Update the strike rate
    scorecard.batsmen[strikerScorecardIndex].strikeRate =
      (scorecard.batsmen[strikerScorecardIndex].runs /
        scorecard.batsmen[strikerScorecardIndex].ballsFaced) *
      100;
  }
  return scorecard;
};
const handleBowlerScorecard = async (match, ball) => {
  const scorecard = await ScoreCard.findOne({ match: match._id });
  if (!scorecard) return new Error("No scorecard found");
  const bowlerScorecardIndex = scorecard.bowlers.findIndex(
    (card) => card.player.toString() === match.openingBowler.toString()
  );
  // handle over completed
  if (ball == null || ball == undefined) {
    scorecard.bowlers[bowlerScorecardIndex].overs++;
    return scorecard;
  }
  if (bowlerScorecardIndex === -1) {
    // Create a new scorecard for the striker
    const newScorecard = {
      player: match.openingBowler,
      overs: 0,
      maidens: 0,
      runsGiven: ball.runsScored,
      wickets: ball.isWicket === true ? 1 : 0,
      economy: 0,
    };
    scorecard.bowlers.push(newScorecard);
  } else {
    // Update the existing scorecard for the bowler
    scorecard.bowlers[bowlerScorecardIndex].runsGiven += ball.runsScored;
    if (ball.isWicket) {
      scorecard.bowlers[bowlerScorecardIndex].wickets++;
    }

    // Update the economy
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
    if (match.team1Batting) {
      match.team2Overs += 1;
      match.team2Balls = 0;
    } else {
      match.team1Overs += 1;
      match.team1Balls = 0;
    }

    // Update bowler stats
    const bowlerStatsIndex = match.bowlerStats.findIndex(
      (playerStat) =>
        playerStat.player.toString() === match.openingBowler.toString()
    );
    match.bowlerStats[bowlerStatsIndex].overs++;

    // Update bowler in scorecard
    const scorecard = await handleBowlerScorecard(match, null);
    await scorecard.save();

    // check over limit
    if (match.bowlerStats[bowlerStatsIndex].overs >= match.oversPerBowler) {
      match.oversCompletedPlayers.push(match.openingBowler);
    }

    // Update striker and non-striker for the next over
    const temp = match.striker;
    match.striker = match.nonStriker;
    match.nonStriker = temp;
  }
};
const addBallToOver = async function (match, ball) {
  // Add the ball to the current over
  match.currentOver.balls.push(ball._id);

  if (match.team1Batting) {
    match.team2Balls++;
  } else {
    match.team1Balls++;
  }

  // Find the current over
  //   let currentOver = match.overs.find(
  //     (over) => over.number === match.currentOver.number
  //   );

  //   if (currentOver) {
  //     // If the current over exists, add the ball to it
  //     currentOver.balls.push(ball._id);
  //   } else {
  //     // If the current over doesn't exist, create a new over and add the ball to it
  //     currentOver = {
  //       number: match.currentOver.number,
  //       balls: [ball._id],
  //     };
  //     match.overs.push(currentOver);
  //   }

  // Find the current over
  let currentOver = await Over.findOne({
    match: match._id,
    number: match.currentOver.number,
  });

  if (currentOver) {
    // If the current over exists, add the ball to it
    currentOver.balls.push(ball._id);
  } else {
    // If the current over doesn't exist, create a new over and add the ball to it
    currentOver = new Over({
      match: match._id,
      number: match.currentOver.number,
      balls: [ball._id],
    });
  }

  // Save the current over
  await currentOver.save();

  // update partnership
  if (!match.partnership) {
    match.partnership = { runs: 0, balls: 0 };
  }
  match.partnership.balls++;
  //   match = await match.save();

  return match;
};
const describeBall = function (batsman, bowler, runs) {
  let runDescription = "";
  switch (runs) {
    case 0:
      runDescription = "Dot ball";
      break;
    case 1:
      runDescription = "Single run";
      break;
    case 2:
      runDescription = "Two runs";
      break;
    case 3:
      runDescription = "Three runs";
      break;
    case 4:
      runDescription = "Four! A boundary";
      break;
    case 5:
      runDescription = "Five runs";
      break;
    case 6:
      runDescription = "Six! A maximum";
      break;
    default:
      runDescription = "Invalid number of runs";
  }

  return `${batsman} hits a ${runDescription} on ${bowler}'s ball.`;
};
const generateWicketMessage = (
  wicketType,
  fielderName,
  bowlerName,
  batsman
) => {
  let message = "The " + batsman + " is out";

  switch (wicketType) {
    case "Bowled":
      message += " bowled by ";
      break;
    case "Caught":
      message += `, caught by ${fielderName} by `;
      break;
    case "LBW":
      message += " leg before wicket (LBW) by ";
      break;
    case "Run Out":
      message += " run out";
      break;
    case "Stumped":
      message += ` stumped by ${fielderName} by `;
      break;
    case "Hit Wicket":
      message += " hit wicket by ";
      break;
    case "Handled Ball":
      message += ` out handled the ball by ${fielderName} by `;
      break;
    case "Obstructing Field":
      message += ` out obstructing the field by ${fielderName} by `;
      break;
    case "Timed Out":
      message += " timed out";
      break;
    case "Hit Twice":
      message += " out hit twice";
      break;
    default:
      message += ` out ${wicketType.toLowerCase()} by `;
  }

  if (wicketType !== "Run Out" && wicketType !== "Stumped") {
    message += bowlerName;
  }

  return message;
};
const updateBatsmanStats = function (match, runsScored, isExtra) {
  // Update player stats
  const strikerStatsIndex = match.playerStats.findIndex(
    (playerStat) => playerStat.player.toString() === match.striker.toString()
  );

  // Update striker's stats
  if (strikerStatsIndex === -1) {
    // Create a new player stats
    const newStrikerStats = {
      player: match.striker,
      ballsFaced: isExtra === true ? 0 : 1,
      runs: runsScored,
      sixes: runsScored === 6 ? 1 : 0,
      fours: runsScored === 4 ? 1 : 0,
      strikeRate: runsScored * 100,
      // Initialize other stats as needed
    };

    // Add the new player stats to the playerStats array
    match.playerStats.push(newStrikerStats);
  } else {
    if (isExtra != true) {
      match.playerStats[strikerStatsIndex].ballsFaced++;
    }
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

  return match;
};
const updateBlowerStats = function (match, ball, extraType) {
  var runsScored = extraType === "byes" ? 0 : ball.runsScored;
  // Update player stats
  const bowlerStatsIndex = match.bowlerStats.findIndex(
    (playerStat) =>
      playerStat.player.toString() === match.openingBowler.toString()
  );

  // Update striker's stats
  if (bowlerStatsIndex === -1) {
    // Create a new player stats
    const newBowlerStats = {
      player: match.openingBowler,
      overs: 0,
      maidens: 0,
      wickets: ball.isWicket == true ? 1 : 0,
      economy: 0,
      runsGiven: runsScored,
      sixes: runsScored === 6 ? 1 : 0,
      fours: runsScored === 4 ? 1 : 0,
    };

    // Add the new player stats to the bowlerStats array
    match.bowlerStats.push(newBowlerStats);
  } else {
    match.bowlerStats[bowlerStatsIndex].runsGiven += runsScored;
    if (runsScored === 6) {
      match.bowlerStats[bowlerStatsIndex].sixes++;
    } else if (runsScored === 4) {
      match.bowlerStats[bowlerStatsIndex].fours++;
    }
    if (ball.isWicket == true) {
      match.bowlerStats[bowlerStatsIndex].wickets++;
    }
  }

  return match;
};
const updateRealPlayerStats = async function (playerId, runsScored, isExtra) {
  const player = await Player.findById(playerId);

  if (!player) {
    return next(new Error("Player not found"));
  }

  if (!player.stats) {
    player.stats = {
      player: match.striker,
      ballsFaced: isExtra === true ? 0 : 1,
      runs: runsScored,
      sixes: runsScored === 6 ? 1 : 0,
      fours: runsScored === 4 ? 1 : 0,
      strikeRate: runsScored * 100,
      // Initialize other stats as needed
    };
  } else {
    if (isExtra != true) {
      player.stats.ballsFaced++;
    }
    player.stats.runs += runsScored;
    if (runsScored === 6) {
      player.stats.sixes++;
    } else if (runsScored === 4) {
      player.stats.fours++;
    }
    // Update the strike rate
    player.stats.strikeRate =
      (player.stats.runs / player.stats.ballsFaced) * 100;
  }

  await player.save();
};

// * Actions handler
exports.action = async (req, res, next, socketIo) => {
  try {
    const { matchId, actionType, data } = req.body;

    const match = await MatchDetails.findById(matchId);
    if (!match) {
      return next(new Error("No match found"));
    }

    let crr, rrr;
    if (match.team1Batting) {
      crr = calculateCurrentRunRate(match.team1Score, match.team2Overs);
      rrr = calculateRequiredRunRate(
        match.team2Score,
        match.numberOfOvers - match.team2Overs
      );
      match.team1CurrentRunRate = crr;
      match.team1RequiredRunRate = rrr;
    } else {
      crr = calculateCurrentRunRate(match.team2Score, match.team1Overs);
      rrr = calculateRequiredRunRate(
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
    // return res.status(500).json({
    //   success: false,
    //   message: "Error while processing the action.",
    //   status: 500,
    //   data: null,
    // });
  }
};

// * Actions
exports.handleScoreAction = async (matchId, runsScored, socketIo) => {
  try {
    // Find the match details
    let match = await MatchDetails.findById(matchId).populate("scorecard");

    const striker = await Player.findById(match.striker);
    const bowler = await Player.findById(match.openingBowler);

    const ballDesc = describeBall(striker.name, bowler.name, runsScored);

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
    match = await addBallToOver(match, ball);

    // Update player stats
    match = updateBatsmanStats(match, runsScored, ball.isExtra);
    match = updateBlowerStats(match, ball, ball.extraType);
    await updateRealPlayerStats(match.striker, runsScored, ball.isExtra);

    let scorecard = await handleStrikerScorecard(match, ball, null, undefined);
    await scorecard.save();
    scorecard = await handleBowlerScorecard(match, ball);
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

    // const ballDesc = describeBall(striker.name, bowler.name, runsScored);
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
    match = await addBallToOver(match, extraBall);

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
      description: generateWicketMessage(
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
    match = await addBallToOver(match, ball);

    // Update player stats
    match = updateBatsmanStats(match, 0, false);
    match = updateBlowerStats(match, ball, ball.extraType);
    await updateRealPlayerStats(match.striker, runsScored, ball.isExtra);

    let scorecard = await handleStrikerScorecard(match, ball, data, undefined);
    await scorecard.save();
    scorecard = await handleBowlerScorecard(match, ball);
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
    await handleOverCompletion(match, socketIo);

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
    match = await addBallToOver(match, extraBall);

    if (runsScored > 0) {
      // Update player stats
      match = updateBatsmanStats(match, runsScored, extraBall.isExtra);
      match = updateBlowerStats(match, extraBall, extraBall.extraType);
      await updateRealPlayerStats(match.striker, runsScored, extraBall.isExtra);

      let scorecard = await handleStrikerScorecard(
        match,
        extraBall,
        null,
        extraBall.extraType
      );
      await scorecard.save();
      scorecard = await handleBowlerScorecard(match, extraBall);
      await scorecard.save();

      // Swap players if odd runs scored
      if (runsScored % 2 === 1) {
        const temp = match.striker;
        match.striker = match.nonStriker;
        match.nonStriker = temp;
      }
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
    match = await addBallToOver(match, ball);

    // Update player stats
    match = updateBatsmanStats(match, 0, ball.isExtra);
    match = updateBlowerStats(match, ball, ball.extraType);
    await updateRealPlayerStats(match.striker, runsScored, ball.isExtra);

    let scorecard = await handleStrikerScorecard(
      match,
      ball,
      null,
      ball.extraType
    );
    await scorecard.save();
    scorecard = await handleBowlerScorecard(match, ball);
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
    throw error;
  }
};
