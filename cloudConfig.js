const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_SECRET_KEY,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "WonderLust",
        allowed_formats: ["jpeg", "png", "jpg"]
    }
});

const upload = multer({ storage });

module.exports = {
    cloudinary,
    storage,
    upload
};
