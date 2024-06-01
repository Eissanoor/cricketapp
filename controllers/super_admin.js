const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SuperAdmin = require("../models/super_admin");

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
