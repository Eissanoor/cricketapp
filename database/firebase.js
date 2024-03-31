const firebase = require("firebase-admin");
var dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
var apiKey = process.env.apiKey;
var authDomain = process.env.authDomain;
var projectId = process.env.projectId;
var storageBucket = process.env.storageBucket;
var messagingSenderId = process.env.messagingSenderId;
var appId = process.env.appId;
var measurementId = process.env.measurementId;
var serviceAccount = require("../cric-media-e667c-firebase-adminsdk-nazyl-2805710143.json");
const firebaseConfig = {
    apiKey: apiKey,
    authDomain: authDomain,
    projectId: projectId,
    storageBucket: storageBucket,
    messagingSenderId: messagingSenderId,
    appId: appId,
    measurementId: measurementId
};


firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount)
});
const db = firebase.firestore();
const firebase_matchDetails = db.collection("matchDetails");
const teamDetails = db.collection("teamDetails");
module.exports = { firebase_matchDetails, teamDetails };