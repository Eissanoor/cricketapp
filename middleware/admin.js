// const Admin = require("../models/admin");

// exports.checkAdminBlocked = async (req, res, next, adminId) => {
//   try {
//     const admin = await Admin.findById(adminId);
//     if (!admin) {
//       const error = new Error("Admin not found");
//       error.statusCode = 404;
//       return next(error);
//     }

//     console.log(admin);

//     if (admin.status == 0) {
//       const error = new Error(
//         "This admin is not allowed to perform any new operations because they have been blocked by the super admin."
//       );
//       error.statusCode = 403;
//       return next(error);
//     }
//     // return;
//     // next();
//   } catch (err) {
//     next(err);
//   }
// };

const Admin = require("../models/admin");

exports.checkAdminBlocked = async (req, res, next) => {
  // Determine the admin ID from different sources and handle arrays
  let adminId = req.body.admin || req.params.adminId || req.query.adminId;
  if (!adminId && req.body.admins) {
    adminId = req.body.admins[0]; // If admins is an array, take the first element
  }
  console.log(adminId);

  if (!adminId) {
    return res.status(400).json({
      status: 400,
      success: false,
      message: "Admin ID not provided",
      data: null,
    });
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        status: 404,
        success: false,
        message: "Admin not found",
        data: null,
      });
    }

    if (admin.status == 0) {
      return res.status(403).json({
        status: 403,
        success: false,
        message: "This admin is blocked and cannot perform this operation",
        data: null,
      });
    }

    // Attach admin to request if further operations need it
    req.admin = admin;

    next();
  } catch (error) {
    console.error("Error checking admin block status:", error);
    next(error);
  }
};
