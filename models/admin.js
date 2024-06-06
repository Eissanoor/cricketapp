const mongoose = require("mongoose");

const validator = require("validator");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const SECRET = process.env.SECRET;

const adminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error("Invalid Email");
        }
      },
    },
    isVarified: Boolean,
    isNewUser: Boolean,

    token: {
      type: String,
    },
    status: {
      type: String,
      default: 1, // 1 means active, 0 means blocked
    },
    password: String,
    Phone: String,
    address: String,
    ProfileImage: String,

    fullname: String,
    expireIn: Number,
    public_id: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.methods.isBlocked = function () {
  return this.status === 0;
};

adminSchema.methods.generateAuthToken = async function () {
  try {
    const token = jwt.sign({ _id: this._id.toString() }, SECRET, {
      expiresIn: "30d",
    });

    this.token = token;
    await this.save();

    return token;
  } catch (error) {
    console.log(error);
    console.log("Error in token generation");
  }
};

adminSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const providerRegister = new mongoose.model("admin", adminSchema);

module.exports = providerRegister;
