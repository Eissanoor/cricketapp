const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const EMAIL = process.env.EMAIL;
const PASS = process.env.Email_otp_pass;

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL,
    pass: PASS,
  },
  pool: true,
  rateLimit: false,
});

/**
 * Sends an email using a specified template.
 * @param {string} to Recipient's email address
 * @param {string} subject Email subject
 * @param {string} templateName Name of the EJS template to use
 * @param {Object} data Data to pass to the template for rendering
 */

async function sendEmail({ to, subject, templateName, data }) {
  console.log("Sending email");
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      `${templateName}.ejs`
    );

    const template = fs.readFileSync(templatePath, "utf8");
    const html = ejs.render(template, {
      logoPath: data.logoPath,
    });

    const mailOptions = {
      from: EMAIL,
      to: to,
      subject: subject,
      html: html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

module.exports = { sendEmail };
