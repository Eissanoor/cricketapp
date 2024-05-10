const Player = require("./models/player");

const player = Player.findById("")
  .then((player) => {
    player.setLatestPerformance("", "");
  })
  .catch((err) => console.log(err));
