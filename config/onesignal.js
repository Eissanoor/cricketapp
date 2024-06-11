const OneSignal = require("onesignal-node");

require("dotenv").config();

// Initialize the OneSignal client
const myClient = new OneSignal.Client({
  userAuthKey: process.env.ONESIGNAL_AUTH_KEY,
  // Your OneSignal User Authentication Key, not required for basic operations
  app: {
    appAuthKey: process.env.ONESIGNAL_REST_API_KEY,
    appId: process.env.ONESIGNAL_APP_ID,
  },
  // Your OneSignal REST API Key and the OneSignal App ID
});

module.exports = myClient;
