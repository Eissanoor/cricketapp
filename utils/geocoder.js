const NodeGeocoder = require("node-geocoder");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
var API_KEY = process.env.API_KEY;
const options = {
  provider: "mapquest",
  httpAdapter: "https",
  apiKey: API_KEY,
  formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;
