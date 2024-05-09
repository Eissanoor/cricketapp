const Ball = require("../models/ball");
const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Player = require("../models/player");
const Over = require("../models/over");

// Function to calculate current run rate
const calculateCurrentRunRate = (totalRuns, totalOvers) => {
  if (totalRuns === 0 && totalOvers === 0) {
    return 0;
  }
  return (totalRuns / totalOvers).toFixed(2);
};
// Function to calculate required run rate
const calculateRequiredRunRate = (targetRuns, remainingOvers) => {
  if (targetRuns === 0 && remainingOvers === 0) {
    return 0;
  }
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
  let scorecard = await ScoreCard.findOne({
    match: match._id,
    innings: match.currentInning.number,
  });

  if (!scorecard) {
    throw new Error("Scorecard not found");
  }
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
        fours: ball.runsScored >= 4 && ball.runsScored < 6 ? 1 : 0,
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
    if (extraType === undefined || extraType === "no ball") {
      scorecard.batsmen[strikerScorecardIndex].runs += ball.runsScored;
      if (extraType != "no ball")
        scorecard.batsmen[strikerScorecardIndex].ballsFaced++;
      if (ball.runsScored >= 4 && ball.runsScored < 6) {
        scorecard.batsmen[strikerScorecardIndex].fours++;
      } else if (ball.runsScored >= 6) {
        scorecard.batsmen[strikerScorecardIndex].sixes++;
      }
    } else {
      if (ball.extraType == "byes" || ball.extraType == "leg byes") {
        scorecard.batsmen[strikerScorecardIndex].ballsFaced++;
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
  const scorecard = await ScoreCard.findOne({
    match: match._id,
    innings: match.currentInning.number,
  });
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
    if (ball.extraType !== "byes")
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

    // check if match is finished or not
    if (match.isMatchFinished()) {
      match = match.finishMatch();
      match = await match.save();
      return socketIo.emit("matchCompleted", match);
    }
    // check if inning is finished or not
    if (match.isInningFinished()) {
      match = match.finishInning();
      match = await match.save();
      return socketIo.emit("inningCompleted", match);
    }
    // Emit over event via web sockets
    return socketIo.emit("overCompleted", {
      matchId: match._id,
      overNumber: match.currentOver.number,
    });
  }

  // check if inning is finished or not
  if (match.isInningFinished()) {
    match = match.finishInning();
    match = await match.save();
    return socketIo.emit("inningCompleted", match);
  }

  // check if match is finished or not
  if (match.isMatchFinished()) {
    match = match.finishMatch();
    match = await match.save();
    return socketIo.emit("matchCompleted", match);
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
  let currentOver = await Over.findOne({
    match: match._id,
    number: match.currentOver.number,
    innings: match.currentInning.number,
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
const updateRealPlayerStats = async function (
  playerId,
  runsScored,
  isExtra,
  totalOvers
) {
  const player = await Player.findById(playerId);

  if (!player) {
    return next(new Error("Player not found"));
  }

  player.updateStats(format, { runs: 100, balls: 50 });

  if (totalOvers === 20) {
    if (!player.t20Stats) {
      player.t20Stats = {
        player: match.striker,
        ballsFaced: isExtra === true ? 0 : 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100,
        // Initialize other t20Stats as needed
      };
    } else {
      if (isExtra != true) {
        player.t20Stats.ballsFaced++;
      }
      player.t20Stats.runs += runsScored;
      if (runsScored === 6) {
        player.t20Stats.sixes++;
      } else if (runsScored === 4) {
        player.t20Stats.fours++;
      }
      // Update the strike rate
      player.t20Stats.strikeRate =
        (player.t20Stats.runs / player.stats.ballsFaced) * 100;
    }
  } else if (totalOvers === 50) {
    if (!player.odiStats) {
      player.odiStats = {
        player: match.striker,
        ballsFaced: isExtra === true ? 0 : 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100,
        // Initialize other odiStats as needed
      };
    } else {
      if (isExtra != true) {
        player.odiStats.ballsFaced++;
      }
      player.odiStats.runs += runsScored;
      if (runsScored === 6) {
        player.odiStats.sixes++;
      } else if (runsScored === 4) {
        player.odiStats.fours++;
      }
      // Update the strike rate
      player.odiStats.strikeRate =
        (player.odiStats.runs / player.stats.ballsFaced) * 100;
    }
  } else {
    if (!player.lastPerformance) {
      player.lastPerformance = {
        player: match.striker,
        ballsFaced: isExtra === true ? 0 : 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100,
        // Initialize other lastPerformance as needed
      };
    } else {
      if (isExtra != true) {
        player.lastPerformance.ballsFaced++;
      }
      player.lastPerformance.runs += runsScored;
      if (runsScored === 6) {
        player.lastPerformance.sixes++;
      } else if (runsScored === 4) {
        player.lastPerformance.fours++;
      }
      // Update the strike rate
      player.lastPerformance.strikeRate =
        (player.lastPerformance.runs / player.stats.ballsFaced) * 100;
    }
  }

  //   if (!player.stats) {
  //     player.stats = {
  //       player: match.striker,
  //       ballsFaced: isExtra === true ? 0 : 1,
  //       runs: runsScored,
  //       sixes: runsScored === 6 ? 1 : 0,
  //       fours: runsScored === 4 ? 1 : 0,
  //       strikeRate: runsScored * 100,
  //       // Initialize other stats as needed
  //     };
  //   } else {
  //     if (isExtra != true) {
  //       player.stats.ballsFaced++;
  //     }
  //     player.stats.runs += runsScored;
  //     if (runsScored === 6) {
  //       player.stats.sixes++;
  //     } else if (runsScored === 4) {
  //       player.stats.fours++;
  //     }
  //     // Update the strike rate
  //     player.stats.strikeRate =
  //       (player.stats.runs / player.stats.ballsFaced) * 100;
  //   }

  await player.save();
};

const setPlayersInnings = async function (playerId, matchId) {
  // set inning values for the batsmen
  const player = await Player.findById(playerId);
  const match = await MatchDetails.findById(matchId);

  if (!player) throw new Error("Player not found");
  if (!match) throw new Error("Match not found");

  if (match.numberOfOvers == 50) await player.setInnings("odi");
  else if (match.numberOfOvers == 20) await player.setInnings("t20");
  else await player.setInnings("other");
};

exports.calculateCurrentRunRate = calculateCurrentRunRate;
exports.calculateRequiredRunRate = calculateRequiredRunRate;
exports.calculateNetRunRate = calculateNetRunRate;
exports.handleStrikerScorecard = handleStrikerScorecard;
exports.handleBowlerScorecard = handleBowlerScorecard;
exports.handleOverCompletion = handleOverCompletion;
exports.addBallToOver = addBallToOver;
exports.describeBall = describeBall;
exports.generateWicketMessage = generateWicketMessage;
exports.updateBatsmanStats = updateBatsmanStats;
exports.updateBlowerStats = updateBlowerStats;
exports.updateRealPlayerStats = updateRealPlayerStats;
exports.setPlayersInnings = setPlayersInnings;
