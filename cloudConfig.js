const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const cloudName = process.env.CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUD_API_KEY || process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUD_API_SECRET || process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
});

const isCloudinaryConfigured = !!(
    cloudName &&
    apiKey &&
    apiSecret &&
    cloudName !== "your_cloudinary_cloud_name" &&
    cloudName !== "moderation"
);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage: write incoming file uploads directly to uploads/ directory
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

/**
 * Process uploaded file: if Cloudinary is configured, attempt upload to Cloudinary.
 * If Cloudinary succeeds, returns Cloudinary url & public_id.
 * If Cloudinary fails or is not configured, returns local URL path (/uploads/filename).
 */
async function processUploadedFile(file) {
    if (!file) return null;

    if (isCloudinaryConfigured) {
        try {
            const result = await cloudinary.uploader.upload(file.path, {
                folder: "wanderlust_DEV",
                resource_type: "image"
            });
            // Try to clean up local temp file after successful Cloudinary upload
            try {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            } catch (e) {
                // ignore unlink error
            }
            return {
                url: result.secure_url || result.url,
                filename: result.public_id || file.filename
            };
        } catch (err) {
            console.warn("Cloudinary upload failed, falling back to local storage:", err.message);
        }
    }

    // Local fallback: use static route /uploads/:filename
    return {
        url: `/uploads/${file.filename}`,
        filename: file.filename || "custom_upload"
    };
}

module.exports = {
    cloudinary,
    storage,
    isCloudinaryConfigured,
    processUploadedFile
};

