const mongoose = require("mongoose");
const Team = require("./models/team"); // replace with the actual path to your Team model
const addTeamRecentPerformance = require("./utils/scorer"); // replace with the actual path to your scorer.js file

// Connect to your MongoDB database
mongoose
  .connect(
    "mongodb://eissanoor:Eisa.123@ac-fpqi8sr-shard-00-00.olvd0r5.mongodb.net:27017,ac-fpqi8sr-shard-00-01.olvd0r5.mongodb.net:27017,ac-fpqi8sr-shard-00-02.olvd0r5.mongodb.net:27017/cricket?replicaSet=atlas-zbl1w1-shard-0&ssl=true&authSource=admin",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => console.log("MongoDB connected..."))
  .catch((err) => console.log(err));

async function testAddTeamRecentPerformance() {
  const team1 = "65fa923da2e3a19ac328a2c2"; // replace with actual team1 id
  const team2 = "6607d7e5b4ab4dfe96c4c311"; // replace with actual team2 id
  const matchId = "6607d7e5b4ab4dfe96c4c311"; // replace with actual match id
  const wins = true;
  const wonByRuns = 10;

  try {
    await addTeamRecentPerformance(team1, team2, matchId, wins, wonByRuns);
    console.log("Team recent performance added successfully");
  } catch (error) {
    console.error("Failed to add team recent performance", error);
  }

  mongoose.connection.close();
}

testAddTeamRecentPerformance();
