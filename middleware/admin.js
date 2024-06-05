const Admin = require("../models/admin");

exports.checkAdminBlocked = async (req, res, next, adminId) => {
  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      return next(error);
    }

    console.log(admin);

    if (admin.status == 0) {
      const error = new Error(
        "This admin is not allowed to perform any new operations because they have been blocked by the super admin."
      );
      error.statusCode = 403;
      return next(error);
    }
    // return;
    // next();
  } catch (err) {
    next(err);
  }
};
