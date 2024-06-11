const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Configure the transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.Email_otp_pass,
  },
});

/**
 * Sends an email using a specified template.
 * @param {string} to Recipient's email address
 * @param {string} subject Email subject
 * @param {string} templateName Name of the EJS template to use
 * @param {Object} data Data to pass to the template for rendering
 */

async function sendEmail({ to, subject, templateName, data }) {
  try {
    const templatePath = path.join(
      __dirname,
      "..",
      "views",
      `${templateName}.ejs`
    );
    const template = fs.readFileSync(templatePath, "utf8");
    const html = ejs.render(template, data);

    const mailOptions = {
      from: process.env.EMAIL,
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
