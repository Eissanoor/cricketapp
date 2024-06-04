const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  contactNo: {
    type: String,
    required: true,
  },
  report: {
    type: String,
    required: true,
  },
});

const Report = mongoose.model("Report", reportSchema);

module.exports = Report;
