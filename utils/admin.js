const Admin = require("../models/admin");

exports.isAdminBlocked = async function (adminId) {
  const admin = await Admin.findByid();
};
