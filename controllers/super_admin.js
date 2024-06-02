const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/super_admin");
const Admin = require("../models/admin");

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const superAdmin = await SuperAdmin.findOne({ email: email });
    if (!superAdmin) {
      const error = new Error("No SuperAdmin found with this email");
      error.statusCode = 404;
      return next(error);
    }

    const passwordMatch = await bcrypt.compare(password, superAdmin.password);
    if (!passwordMatch) {
      const error = new Error("Password does not match");
      error.statusCode = 401;
      return next(error);
    }

    // const token = jwt.sign(
    //   { superAdminId: superAdmin._id.toString() },
    //   "yourJWTsecret",
    //   { expiresIn: "1h" }
    // );

    res.status(200).json({
      status: 200,
      success: true,
      message: "SuperAdmin logged in successfully",
      data: null,
    });
  } catch (err) {
    next(err);
  }
};

// * Admins Section ***

exports.getAdmins = async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const admins = await Admin.find()
      .skip(skip)
      .limit(limit)
      .select("email status Phone ProfileImage fullname createdAt updatedAt");
    if (!admins || admins.length === 0) {
      const error = new Error("No Admins found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Admins fetched successfully",
      data: admins,
    });
  } catch (err) {
    next(err);
  }
};

exports.toggleAdminStatus = async (req, res, next) => {
  const adminId = req.params.adminId;

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      return next(error);
    }

    admin.status = admin.status === 1 ? 0 : 1;
    await admin.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Admin status toggled successfully",
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};

exports.changeAdminStatus = async (req, res, next) => {
  const adminId = req.params.adminId;
  const status = req.body.status;

  if (![0, 1].includes(status)) {
    const error = new Error("Invalid status");
    error.statusCode = 400;
    return next(error);
  }

  try {
    const admin = await Admin.findById(adminId);
    if (!admin) {
      const error = new Error("Admin not found");
      error.statusCode = 404;
      return next(error);
    }

    admin.status = status;
    await admin.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Admin status updated successfully",
      data: admin,
    });
  } catch (err) {
    next(err);
  }
};
