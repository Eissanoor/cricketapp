const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SuperAdmin = require("../models/super_admin");
const Admin = require("../models/admin");
const News = require("../models/news");
const SocialLink = require("../models/social_link");
const Report = require("../models/report");
const Video = require("../models/video");

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

// * News Section ***

exports.postNews = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const imageUrl = req.file ? req.file.path : null;

    const news = new News({
      title: title,
      description: description,
      image: imageUrl,
    });

    await news.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "News article created successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.getNews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const news = await News.find()
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    if (!news || news.length === 0) {
      const error = new Error("No news articles found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "News articles fetched successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.putNews = async (req, res, next) => {
  const newsId = req.params.newsId;
  const { title, description } = req.body;
  const imageUrl = req.file ? req.file.path : null;

  try {
    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("News article not found");
      error.statusCode = 404;
      return next(error);
    }

    news.title = title;
    news.description = description;
    if (imageUrl) {
      news.image = imageUrl;
    }

    await news.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "News article updated successfully",
      data: news,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteNews = async (req, res, next) => {
  const newsId = req.params.newsId;

  try {
    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("News article not found");
      error.statusCode = 404;
      return next(error);
    }

    await news.remove();

    res.status(200).json({
      status: 200,
      success: true,
      message: "News article deleted successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

exports.putViewNews = async (req, res, next) => {
  const { newsId, adminId } = req.body;

  try {
    if (newsId == null || newsId == undefined) {
      const error = new Error("News ID is required");
      error.statusCode = 400;
      return next(error);
    }

    if (adminId == null || adminId == undefined) {
      const error = new Error("Admin ID is required");
      error.statusCode = 400;
      return next(error);
    }

    const news = await News.findById(newsId);
    if (!news) {
      const error = new Error("No news found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    if (!news.viewers.includes(adminId)) {
      news.viewers.push(adminId);
      await news.save();
    } else {
      const error = new Error("You have already viewed this news");
      error.statusCode = 400;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "News views increased successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};

// * Social link Section ***

exports.postSocialLink = async (req, res, next) => {
  const { mediaType, link } = req.body;

  try {
    const socialLink = new SocialLink({ mediaType, link });

    await socialLink.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Social link created successfully",
      data: socialLink,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

exports.getSocialLinks = async (req, res, next) => {
  try {
    const socialLinks = await SocialLink.find().sort({ _id: -1 });

    if (!socialLinks || socialLinks.length === 0) {
      const error = new Error("No social links found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social links retrieved successfully",
      data: socialLinks,
    });
  } catch (error) {
    next(error);
  }
};

exports.putSocialLink = async (req, res, next) => {
  const { mediaType, link } = req.body;
  const { id } = req.params;

  try {
    const socialLink = await SocialLink.findById(id);

    if (!socialLink) {
      const error = new Error("No social link found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    socialLink.mediaType = mediaType;
    socialLink.link = link;

    await socialLink.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social link updated successfully",
      data: socialLink,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteSocialLink = async (req, res, next) => {
  const { id } = req.params;

  try {
    const socialLink = await SocialLink.findById(id);

    if (!socialLink) {
      const error = new Error("No social link found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    await SocialLink.findByIdAndRemove(id);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Social link deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// * Reports Section ***

exports.postReport = async (req, res, next) => {
  try {
    const { name, contactNo, report } = req.body;

    const newReport = new Report({
      name,
      contactNo,
      report,
    });

    const savedReport = await newReport.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Report submitted successfully",
      data: savedReport,
    });
  } catch (error) {
    next(error);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const reports = await Report.find()
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Reports fetched successfully",
      data: reports,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteReport = async (req, res, next) => {
  const { id } = req.params;

  try {
    const report = await Report.findById(id);

    if (!report) {
      const error = new Error("No report found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    await Report.findByIdAndRemove(id);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// * Videos Section ***

exports.postVideo = async (req, res, next) => {
  const { title, description } = req.body;
  const videoFile = req.files.video[0];
  const thumbnailFile = req.files.thumbnail[0];

  try {
    // assuming videoUrl is path where video is stored
    const videoUrl = videoFile.path;
    const thumbnail = thumbnailFile.path; // set this to wherever your thumbnail is

    const video = new Video({
      title,
      description,
      videoUrl,
      thumbnail,
      viewers: [], // initially no viewers
    });

    await video.save();

    res.status(201).json({
      status: 201,
      success: true,
      message: "Video uploaded successfully",
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

exports.getVideos = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const skip = (page - 1) * limit;

    const videos = await Video.find().sort({ _id: -1 }).skip(skip).limit(limit);

    if (videos.length === 0) {
      const error = new Error("No videos found");
      error.statusCode = 404;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Videos fetched successfully",
      data: videos,
    });
  } catch (error) {
    next(error);
  }
};

exports.putVideo = async (req, res, next) => {
  const { title, description } = req.body;
  const { id } = req.params;

  try {
    const video = await Video.findById(id);

    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    video.title = title;
    video.description = description;

    await video.save();

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video updated successfully",
      data: video,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteVideo = async (req, res, next) => {
  const { id } = req.params;

  try {
    const video = await Video.findById(id);

    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }
    // delete video from cloudinary
    await cloudinary.uploader.destroy(video.public_id);
    await Video.findByIdAndRemove(id);

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

exports.putViewVideo = async (req, res, next) => {
  const { videoId, adminId } = req.body;

  try {
    if (videoId == null || videoId == undefined) {
      const error = new Error("Video ID is required");
      error.statusCode = 400;
      return next(error);
    }

    if (adminId == null || adminId == undefined) {
      const error = new Error("Admin ID is required");
      error.statusCode = 400;
      return next(error);
    }

    const video = await Video.findById(videoId);
    if (!video) {
      const error = new Error("No video found with this ID");
      error.statusCode = 404;
      return next(error);
    }

    if (!video.viewers.includes(adminId)) {
      video.viewers.push(adminId);
      await video.save();
    } else {
      const error = new Error("You have already viewed this video");
      error.statusCode = 400;
      return next(error);
    }

    res.status(200).json({
      status: 200,
      success: true,
      message: "Video views increased successfully",
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
