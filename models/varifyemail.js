const mongoose = require("mongoose");


const empoleeSchema = new mongoose.Schema({
    //

    email: {
        type: String,
    },
    code: String,
    expireIn: Number
});
/////colletion
const emailvarify = new mongoose.model("emailvarifyOtp", empoleeSchema);

module.exports = emailvarify;
