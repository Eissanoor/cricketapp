const mongoose = require("mongoose");

const Ball = require("../models/ball");
const MatchDetails = require("../models/match_details");
const ScoreCard = require("../models/score_card");
const Player = require("../models/player");
const Over = require("../models/over");
const Team = require("../models/team");
const PointsTable = require("../models/points_table");
const Tournament = require("../models/tournament");

const calculateCurrentRunRate = (totalRuns, totalOvers) => {
  if (totalRuns === 0 && totalOvers === 0) {
    return 0;
  }
  return (totalRuns / totalOvers).toFixed(2);
};

const calculateRequiredRunRate = (targetRuns, remainingOvers) => {
  if (targetRuns === 0 && remainingOvers === 0) {
    return 0;
  }
  return (targetRuns / remainingOvers).toFixed(2);
};

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

    match.calculateCurrentRunRate();
    match.calculateRequiredRunRate();

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
      // Add recent performance to the team
      await addTeamRecentPerformance(
        match.team1,
        match.team2,
        match._id,
        match.winningTeam.toString() === match.team1.toString(),
        match.winningTeam.toString() === match.team1.toString()
          ? match.team1Score - match.team2Score
          : 0
      );
      await addTeamRecentPerformance(
        match.team2,
        match.team1,
        match._id,
        match.winningTeam.toString() === match.team2.toString(),
        match.winningTeam.toString() === match.team2.toString()
          ? match.team2Score - match.team1Score
          : 0
      );

      // add points table for both teams
      await createPointsTable(match);

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
    // Add recent performance to the team
    await addTeamRecentPerformance(
      match.team1,
      match.team2,
      match._id,
      match.winningTeam.toString() === match.team1.toString(),
      match.winningTeam.toString() === match.team1.toString()
        ? match.team1Score - match.team2Score
        : 0
    );
    await addTeamRecentPerformance(
      match.team2,
      match.team1,
      match._id,
      match.winningTeam.toString() === match.team2.toString(),
      match.winningTeam.toString() === match.team2.toString()
        ? match.team2Score - match.team1Score
        : 0
    );

    // add points table for both teams
    await createPointsTable(match);

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
  match,
  runsScored,
  isExtra,
  totalOvers
) {
  const player = await Player.findById(match.striker);

  if (!player) {
    return next(new Error("Player not found"));
  }

  // update the latest performance stats
  await player.updateLatestPerformanceScore(match._id, runsScored);

  if (totalOvers === 20) {
    if (!player.t20Stats) {
      player.t20Stats = {
        player: match.striker,
        balls: isExtra === true ? 0 : 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100,
        // Initialize other t20Stats as needed
      };
    } else {
      if (isExtra != true) {
        player.t20Stats.balls++;
      }
      player.t20Stats.runs += runsScored;
      if (runsScored === 6) {
        player.t20Stats.sixes++;
      } else if (runsScored === 4) {
        player.t20Stats.fours++;
      }
      // Update the strike rate
      player.t20Stats.strikeRate =
        (player.t20Stats.runs / player.t20Stats.balls) * 100;
    }
  } else if (totalOvers === 50) {
    if (!player.odiStats) {
      player.odiStats = {
        player: match.striker,
        balls: isExtra === true ? 0 : 1,
        runs: runsScored,
        sixes: runsScored === 6 ? 1 : 0,
        fours: runsScored === 4 ? 1 : 0,
        strikeRate: runsScored * 100,
        // Initialize other odiStats as needed
      };
    } else {
      if (isExtra != true) {
        player.odiStats.balls++;
      }
      player.odiStats.runs += runsScored;
      if (runsScored === 6) {
        player.odiStats.sixes++;
      } else if (runsScored === 4) {
        player.odiStats.fours++;
      }
      // Update the strike rate
      player.odiStats.strikeRate =
        (player.odiStats.runs / player.odiStats.balls) * 100;
    }
  }

  if (!player.stats) {
    player.stats = {
      player: match.striker,
      balls: isExtra === true ? 0 : 1,
      runs: runsScored,
      sixes: runsScored === 6 ? 1 : 0,
      fours: runsScored === 4 ? 1 : 0,
      strikeRate: runsScored * 100,
      // Initialize other stats as needed
    };
  } else {
    if (isExtra != true) {
      player.stats.balls++;
    }
    player.stats.runs += runsScored;
    if (runsScored === 6) {
      player.stats.sixes++;
    } else if (runsScored === 4) {
      player.stats.fours++;
    }
    // Update the strike rate
    player.stats.strikeRate = (player.stats.runs / player.stats.balls) * 100;
  }

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
};

const addLatestPerformance = async function (playerId, matchId, teamId) {
  const player = await Player.findById(playerId);

  // Create a new performance object
  const newPerformance = {
    match: matchId,
    team: teamId,
    runs: 0,
  };

  if (player.latestPerformance.length >= 5) {
    player.latestPerformance.pop();
  }

  player.latestPerformance.unshift(newPerformance);
  player.markModified("latestPerformance");

  // Save the changes to the database
  await player.save();
};

const addTeamRecentPerformance = async function addTeamRecentPerformance(
  team1,
  team2,
  matchId,
  wins,
  wonByRuns
) {
  try {
    const team = await Team.findById(team1);

    // Find the team index in the recentPerformance array
    let teamIndex = team.recentPerformance.findIndex(
      (performance) => performance.team.toString() === team2.toString()
    );

    // If the team doesn't exist in recentPerformance, add it
    if (teamIndex === -1) {
      team.recentPerformance.push({
        team: team2,
        history: [],
      });
      // Update the teamIndex to point to the newly added team
      teamIndex = team.recentPerformance.length - 1;
    }

    // Get the team's recent performance
    const teamPerformance = team.recentPerformance[teamIndex];

    // Add the new performance at the beginning of the history array
    teamPerformance.history.unshift({
      wins: wins,
      wonByRuns: wonByRuns,
      match: matchId,
    });

    // If the history array has reached its max size, remove the last element
    if (teamPerformance.history.length > 5) {
      teamPerformance.history.pop();
    }
    await team.save();
  } catch (error) {
    throw error;
  }
};

const createPointsTable = async function (match) {
  if (match.tournamentInfo) {
    // Winning case
    if (!match.draw) {
      let pointsTableTeam1;
      let pointsTableTeam2;

      // TODO check if match is group match or team match
      if (match.tournamentInfo.group) {
        pointsTableTeam1 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team1,
          group: match.tournamentInfo.group,
        });

        pointsTableTeam2 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team2,
          group: match.tournamentInfo.group,
        });
      } else {
        pointsTableTeam1 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team1,
        });

        pointsTableTeam2 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team2,
        });
      }
      // Update team1 points table
      if (pointsTableTeam1) {
        pointsTableTeam1.matchesPlayed += 1;
        pointsTableTeam1.runsScored += match.team1Score; // Assuming match has team1Runs
        pointsTableTeam1.runsAgainst += match.team2Score; // Assuming match has team2Runs
        pointsTableTeam1.oversFaced += match.team2Overs; // Assuming match has team2Overs

        if (match.winningTeam === match.team1) {
          pointsTableTeam1.wins += 1;
          pointsTableTeam1.points += 2; // Assuming 2 points for a win
        } else {
          pointsTableTeam1.losses += 1;
        }

        pointsTableTeam1.calculateNRR();
        await pointsTableTeam1.save();
      } else {
        // Create a new points table entry for team1
        pointsTableTeam1 = new PointsTable({
          team: match.team1,
          tournament: match.tournamentInfo.tournament,
          matchesPlayed: 1,
          runsScored: match.team1Score,
          runsAgainst: match.team2Score,
          oversFaced: match.team2Overs,
          wins: match.winningTeam === match.team1 ? 1 : 0,
          losses: match.winningTeam === match.team1 ? 0 : 1,
          draws: 0,
          points: match.winningTeam === match.team1 ? 2 : 0,
        });

        pointsTableTeam1.calculateNRR();
        await pointsTableTeam1.save();
      }

      // Update team2 points table
      if (pointsTableTeam2) {
        pointsTableTeam2.matchesPlayed += 1;
        pointsTableTeam2.runsScored += match.team2Score; // Assuming match has team2Runs
        pointsTableTeam2.runsAgainst += match.team1Score; // Assuming match has team1Runs
        pointsTableTeam2.oversFaced += match.team1Overs; // Assuming match has team1Overs

        if (match.winningTeam === match.team2) {
          pointsTableTeam2.wins += 1;
          pointsTableTeam2.points += 2; // Assuming 2 points for a win
        } else {
          pointsTableTeam2.losses += 1;
        }

        pointsTableTeam2.calculateNRR();
        await pointsTableTeam2.save();
      } else {
        // Create a new points table entry for team2
        pointsTableTeam2 = new PointsTable({
          team: match.team2,
          tournament: match.tournamentInfo.tournament,
          matchesPlayed: 1,
          runsScored: match.team2Score,
          runsAgainst: match.team1Score,
          oversFaced: match.team1Overs,
          wins: match.winningTeam === match.team2 ? 1 : 0,
          losses: match.winningTeam === match.team2 ? 0 : 1,
          draws: 0,
          points: match.winningTeam === match.team2 ? 2 : 0,
        });

        pointsTableTeam2.calculateNRR();
        await pointsTableTeam2.save();
      }

      if (match.tournamentInfo.group) {
        if (match.tournamentInfo.matchType === "series") {
          handleSeriesGroupMatch(match);
        } else if (match.tournamentInfo.matchType === "qualifier") {
          handleQualifierGroupMatch(match);
        } else if (match.tournamentInfo.matchType === "semiFinal") {
          handleSemiFinalGroupMatch(match);
        } else if (match.tournamentInfo.matchType === "final") {
          handleFinalGroupMatch(match);
        }
      } else {
        if (match.tournamentInfo.matchType === "series") {
        } else if (match.tournamentInfo.matchType === "qualifier") {
          let tournament;
          tournament = await Tournament.findById(
            match.tournamentInfo.tournament
          );
          if (!tournament) {
            const error = new Error(`Couldn't find tournament`);
            error.statusCode = 404;
            return next(error);
          }
          tournament.semiFinalTeams.push(match.winningTeam);
          const teamIndex = tournament.teams.findIndex(
            (team) => team._id.toString() === match.winningTeam.toString()
          );
          if (teamIndex != -1) tournament.teams[teamIndex].qualified = true;
          await tournament.save();
          const pt = await PointsTable.findOne({
            team: mongoose.Types.ObjectId(match.winningTeam),
          });
          pt.qualifier = true;
          await pt.save();
        } else if (match.tournamentInfo.matchType === "semiFinal") {
        } else if (match.tournamentInfo.matchType === "final") {
        }
      }
    }

    // Draw case
    else {
      let pointsTableTeam1;
      let pointsTableTeam2;
      if (match.tournamentInfo.group) {
        pointsTableTeam1 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team1,
          group: match.tournamentInfo.group,
        });

        pointsTableTeam2 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team2,
          group: match.tournamentInfo.group,
        });
      } else {
        pointsTableTeam1 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team1,
        });

        pointsTableTeam2 = await PointsTable.findOne({
          tournament: match.tournamentInfo.tournament,
          team: match.team2,
        });
      }

      // Update team1 points table
      if (pointsTableTeam1) {
        pointsTableTeam1.matchesPlayed += 1;
        pointsTableTeam1.runsScored += match.team1Runs; // Assuming match has team1Runs
        pointsTableTeam1.runsAgainst += match.team2Runs; // Assuming match has team2Runs
        pointsTableTeam1.oversFaced += match.team2Overs; // Assuming match has team2Overs
        pointsTableTeam1.draws += 1;
        pointsTableTeam1.points += 1; // 1 point for a draw

        pointsTableTeam1.calculateNRR();
        await pointsTableTeam1.save();
      } else {
        // Create a new points table entry for team1
        pointsTableTeam1 = new PointsTable({
          team: match.team1,
          tournament: match.tournamentInfo.tournament,
          matchesPlayed: 1,
          runsScored: match.team1Runs,
          runsAgainst: match.team2Runs,
          oversFaced: match.team2Overs,
          draws: 1,
          points: 1, // 1 point for a draw
        });

        pointsTableTeam1.calculateNRR();
        await pointsTableTeam1.save();
      }

      // Update team2 points table
      if (pointsTableTeam2) {
        pointsTableTeam2.matchesPlayed += 1;
        pointsTableTeam2.runsScored += match.team2Runs; // Assuming match has team2Runs
        pointsTableTeam2.runsAgainst += match.team1Runs; // Assuming match has team1Runs
        pointsTableTeam2.oversFaced += match.team1Overs; // Assuming match has team2Overs
        pointsTableTeam2.draws += 1;
        pointsTableTeam2.points += 1; // 1 point for a draw

        pointsTableTeam2.calculateNRR();
        await pointsTableTeam2.save();
      } else {
        // Create a new points table entry for team2
        pointsTableTeam2 = new PointsTable({
          team: match.team2,
          tournament: match.tournamentInfo.tournament,
          matchesPlayed: 1,
          runsScored: match.team2Runs,
          runsAgainst: match.team1Runs,
          oversFaced: match.team1Overs,
          draws: 1,
          points: 1, // 1 point for a draw
        });

        pointsTableTeam2.calculateNRR();
        await pointsTableTeam2.save();
      }
    }
  }
};

const handleSeriesGroupMatch = async function (match) {
  let tournament;
  // TODO 1: Sort points table
  // Find all points table entries with the same tournament id and group id
  let pointsTables = await PointsTable.find({
    tournament: match.tournamentInfo.tournament,
    group: match.tournamentInfo.group,
  });
  // Sort the points table entries based on the net run rate
  pointsTables.sort((a, b) => b.netRunRate - a.netRunRate);
  // Save the sorted points table entries
  for (let pointsTable of pointsTables) {
    pointsTable.qualifier = true;
    await pointsTable.save();
  }

  tournament = await Tournament.findById(match.tournamentInfo.tournament);
  if (!tournament) {
    const error = new Error(`Couldn't find tournament`);
    error.statusCode = 404;
    return next(error);
  }

  // find specific group
  const groupIndex = tournament.groups.findIndex(
    (g) => g._id.toString() === match.tournamentInfo.group.toString()
  );

  if (groupIndex != -1) {
    tournament.groups[groupIndex].totalMatches--;
    // TODO 2: Qualify teams to the next round if it is last match of the tournament group
    if (tournament.groups[groupIndex].totalMatches <= 0) {
      let qualifiersNumber = tournament.groups[groupIndex].qualifiersNumber;

      // Reset all teams in the group
      tournament.groups[groupIndex].teams.forEach((team) => {
        team.qualified = false;
        team.eliminated = true;
      });

      for (let i = 0; i < qualifiersNumber; i++) {
        if (pointsTables[i]) {
          const pt = await PointsTable.findById(pointsTables[i]._id);

          const teamIndex = tournament.groups[groupIndex].teams.findIndex(
            (t) => t.team.toString() === pt.team.toString()
          );

          // Mark the team as qualified
          tournament.groups[groupIndex].teams[teamIndex].qualified = true;
          tournament.groups[groupIndex].teams[teamIndex].eliminated = false;

          // Add the team to the qualifiers
          tournament.qualifiers.push(pt.team);

          let qualifierGroup = tournament.groups.find(
            (group) => group.name == "qualifier"
          );

          if (qualifierGroup) {
            // Append the team and points table to the existing group
            qualifierGroup.teams.push({
              team: pt.team,
            });
            qualifierGroup.pointsTable.push(pointsTables[i]._id);
          } else {
            // Create a new group
            tournament.groups.push({
              name: "qualifier",
              teams: [
                {
                  team: pt.team,
                  qualified: null,
                  eliminated: null,
                },
              ],
              pointsTable: [pointsTables[i]._id],
              // totalMatches: qualifiersNumber,
              qualifiersNumber: 4, // four of the teams will go into the Semi-final
            });
          }
        }
      }

      //   const pt1 = await PointsTable.findById(pointsTables[0]._id);
      //   const pt2 = await PointsTable.findById(pointsTables[1]._id);

      //   const team1 = tournament.groups[groupIndex].teams.findIndex(
      //     (t) => t.team.toString() === pt1.team.toString()
      //   );
      //   const team2 = tournament.groups[groupIndex].teams.findIndex(
      //     (t) => t.team.toString() === pt2.team.toString()
      //   );

      //   tournament.groups[groupIndex].teams.forEach((team) => {
      //     team.qualified = false;
      //     team.eliminated = true;
      //   });

      //   tournament.groups[groupIndex].teams[team1].qualified = true;
      //   tournament.groups[groupIndex].teams[team2].qualified = true;

      //   tournament.qualifiers.push(pt1.team);
      //   tournament.qualifiers.push(pt2.team);

      //   let qualifierGroup = tournament.groups.find(
      //     (group) => group.name == "qualifier"
      //   );

      //   if (qualifierGroup) {
      //     // Append the teams and points tables to the existing group
      //     qualifierGroup.teams.push(pt1.team, pt2.team);
      //     qualifierGroup.pointsTable.push(
      //       pointsTables[0]._id,
      //       pointsTables[1]._id
      //     );
      //   } else {
      //     // Create a new group
      //     tournament.groups.push({
      //       name: "qualifier",
      //       teams: [pt1.team, pt2.team],
      //       pointsTable: [pointsTables[0]._id, pointsTables[1]._id],
      //       totalMatches: 2,
      //       qualifiersNumber: 2,
      //     });
      //   }
    }
    await tournament.save();
  }
};

const handleQualifierGroupMatch = async function (match) {
  let tournament;
  // TODO 1: Sort points table
  // Find all points table entries with the same tournament id and group id
  let pointsTables = await PointsTable.find({
    tournament: match.tournamentInfo.tournament,
    // group: match.tournamentInfo.group,
    qualifier: true,
  });
  console.log(match.tournamentInfo.tournament, match.tournamentInfo.group);
  console.log(pointsTables);

  // Sort the points table entries based on the net run rate
  pointsTables.sort((a, b) => b.netRunRate - a.netRunRate);

  // Save the sorted points table entries
  for (let pointsTable of pointsTables) {
    pointsTable.semiFinal = true;
    await pointsTable.save();
  }

  tournament = await Tournament.findById(match.tournamentInfo.tournament);
  if (!tournament) {
    const error = new Error(`Couldn't find tournament`);
    error.statusCode = 404;
    return next(error);
  }

  // find specific group
  const groupIndex = tournament.groups.findIndex(
    (g) => g._id.toString() === match.tournamentInfo.group.toString()
  );

  if (groupIndex === -1) {
    const error = new Error(`Group not found`);
    error.statusCode = 404;
    return next(error);
  }

  // Decrease total matches for the group
  tournament.groups[groupIndex].totalMatches--;

  // TODO 2: Qualify teams to the next round if it is the last match of the tournament group
  if (tournament.groups[groupIndex].totalMatches <= 0) {
    let qualifiersNumber = 2; // Can be adjusted or taken from group if needed
    console.log("Our total matches > 0");
    console.log(qualifiersNumber);

    // Reset all teams in the group
    tournament.groups[groupIndex].teams.forEach((team) => {
      team.qualified = false;
      team.eliminated = true;
    });

    for (let i = 0; i < qualifiersNumber; i++) {
      if (pointsTables[i]) {
        console.log("inside points table if check");
        const pt = await PointsTable.findById(pointsTables[i]._id);

        const teamIndex = tournament.groups[groupIndex].teams.findIndex(
          (t) => t.team.toString() === pt.team.toString()
        );

        if (teamIndex !== -1) {
          console.log("Found team at index " + teamIndex);
          // Mark the team as qualified
          tournament.groups[groupIndex].teams[teamIndex].qualified = true;
          tournament.groups[groupIndex].teams[teamIndex].eliminated = false;
        }

        let semiFinalGroup = tournament.groups.find(
          (group) => group.name.toString() === "semiFinal"
        );

        if (semiFinalGroup) {
          // Append the team and points table to the existing group
          semiFinalGroup.teams.push({
            team: pt.team,
          });
          semiFinalGroup.pointsTable.push(pointsTables[i]._id);
        } else {
          // Create a new group
          tournament.groups.push({
            name: "semiFinal",
            teams: [
              {
                team: pt.team,
                qualified: null,
                eliminated: null,
              },
            ],
            pointsTable: [pointsTables[i]._id],
            totalMatches: 2,
            qualifiersNumber: 2, // two of the teams will go into the final
          });
        }
        console.log(tournament.groups);
      }
    }
  }

  await tournament.save();
};

const handleSemiFinalGroupMatch = async function (match) {
  let tournament;
  // Find all points table entries with the same tournament id and group name "semiFinal"
  let pointsTables = await PointsTable.find({
    tournament: match.tournamentInfo.tournament,
    semiFinal: true,
  });

  // Sort the points table entries based on the net run rate
  pointsTables.sort((a, b) => b.netRunRate - a.netRunRate);

  // Save the sorted points table entries
  for (let pointsTable of pointsTables) {
    pointsTable.final = true;
    await pointsTable.save();
  }

  tournament = await Tournament.findById(match.tournamentInfo.tournament);
  if (!tournament) {
    const error = new Error(`Couldn't find tournament`);
    error.statusCode = 404;
    return next(error);
  }

  // find specific group
  const groupIndex = tournament.groups.findIndex(
    (g) => g.name.toString() === "semiFinal"
  );

  if (groupIndex === -1) {
    const error = new Error(`Group not found`);
    error.statusCode = 404;
    return next(error);
  }

  // Decrease total matches for the group
  tournament.groups[groupIndex].totalMatches--;

  // Qualify teams to the final if it is the last match of the semi-final group
  if (tournament.groups[groupIndex].totalMatches <= 0) {
    let qualifiersNumber = 1; // Can be adjusted or taken from group if needed

    // Reset all teams in the group
    tournament.groups[groupIndex].teams.forEach((team) => {
      team.qualified = false;
      team.eliminated = true;
    });

    for (let i = 0; i < qualifiersNumber; i++) {
      if (pointsTables[i]) {
        const pt = await PointsTable.findById(pointsTables[i]._id);

        const teamIndex = tournament.groups[groupIndex].teams.findIndex(
          (t) => t.team.toString() === pt.team.toString()
        );

        if (teamIndex !== -1) {
          // Mark the team as qualified
          tournament.groups[groupIndex].teams[teamIndex].qualified = true;
          tournament.groups[groupIndex].teams[teamIndex].eliminated = false;
        }

        let finalGroup = tournament.groups.find(
          (group) => group.name.toString() === "final"
        );

        if (finalGroup) {
          // Append the team and points table to the existing group
          finalGroup.teams.push({
            team: pt.team,
          });
          finalGroup.pointsTable.push(pointsTables[i]._id);
        } else {
          // Create a new group
          tournament.groups.push({
            name: "final",
            teams: [
              {
                team: pt.team,
                qualified: null,
                eliminated: null,
              },
            ],
            pointsTable: [pointsTables[i]._id],
            totalMatches: 1,
            qualifiersNumber: 1, // one of the teams will win the tournament
          });
        }
      }
    }
  }

  await tournament.save();
};

const handleFinalGroupMatch = async function (match) {
  let tournament;
  // Find all points table entries with the same tournament id and group name "final"
  let pointsTables = await PointsTable.find({
    tournament: match.tournamentInfo.tournament,
    final: true,
  });

  // Sort the points table entries based on the net run rate
  pointsTables.sort((a, b) => b.netRunRate - a.netRunRate);

  // Save the sorted points table entries
  for (let pointsTable of pointsTables) {
    await pointsTable.save();
  }

  tournament = await Tournament.findById(match.tournamentInfo.tournament);
  if (!tournament) {
    const error = new Error(`Couldn't find tournament`);
    error.statusCode = 404;
    return next(error);
  }

  // find specific group
  const groupIndex = tournament.groups.findIndex(
    (g) => g.name.toString() === "final"
  );

  if (groupIndex === -1) {
    const error = new Error(`Group not found`);
    error.statusCode = 404;
    return next(error);
  }

  // Decrease total matches for the group
  tournament.groups[groupIndex].totalMatches--;

  // Assign the winner if it is the last match of the final group
  if (tournament.groups[groupIndex].totalMatches <= 0) {
    if (pointsTables[0]) {
      const pt = await PointsTable.findById(pointsTables[0]._id);

      const teamIndex = tournament.groups[groupIndex].teams.findIndex(
        (t) => t.team.toString() === pt.team.toString()
      );

      if (teamIndex !== -1) {
        // Mark the team as the winner
        tournament.winner = tournament.groups[groupIndex].teams[teamIndex].team;
      }
    }
  }

  await tournament.save();
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
exports.addLatestPerformance = addLatestPerformance;
exports.addTeamRecentPerformance = addTeamRecentPerformance;
exports.createPointsTable = createPointsTable;
