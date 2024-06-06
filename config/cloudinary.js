// // cloudinary.js
// const cloudinary = require("cloudinary").v2;
// const { CloudinaryStorage } = require("multer-storage-cloudinary");
// const dotenv = require("dotenv");
// dotenv.config({ path: "./config.env" });

// cloudinary.config({
//   cloud_name: process.env.C_cloud_name,
//   api_key: process.env.C_api_key,
//   api_secret: process.env.C_api_secret,
// });

// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: async (req, file) => {
//     let folder = "uploads";
//     let resource_type = "image";
//     if (file.mimetype.startsWith("video/")) {
//       resource_type = "video";
//     }

//     return {
//       folder: folder,
//       allowed_formats: ["jpg", "png", "jpeg", "mp4", "mkv", "avi"],
//       resource_type: resource_type,
//     };
//   },
// });

// module.exports = { cloudinary, storage };

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid"); // To generate unique IDs
dotenv.config({ path: "./config.env" });

cloudinary.config({
  cloud_name: process.env.C_cloud_name,
  api_key: process.env.C_api_key,
  api_secret: process.env.C_api_secret,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = "uploads";
    let resource_type = "image";
    if (file.mimetype.startsWith("video/")) {
      resource_type = "video";
    }

    const uniqueId = uuidv4();
    const originalFileName = file.originalname.replace(/\.[^/.]+$/, ""); // Remove file extension
    const public_id = `${uniqueId}_${originalFileName}`; // Combine UUID and original file name

    return {
      folder: folder,
      allowed_formats: ["jpg", "png", "jpeg", "mp4", "mkv", "avi"],
      resource_type: resource_type,
      public_id: public_id, // Assign the unique public_id
    };
  },
});

module.exports = { cloudinary, storage };
