// ==============================
// utils/upload.js — Image Upload Handler
// ==============================
// Handles secure in-memory image uploads using Multer.
// Resizes images with Sharp, saves them to /public/images.
// + provides delete functionality. Used for avatars, event photos, etc.

const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// Setup Multer for in-memory storage
const storage = multer.memoryStorage();
const maxSize = 10 * 1024 * 1024; // 10MB

// File type filter: allow only PNG and JPG
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("❌ Only PNG and JPG image files are allowed"), false);
  }
  cb(null, true);
};

// Upload middleware with filter as weell as size limit
const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter,
});

// Save image to /public/images
function saveImage(
  originalName,
  fileBuffer,
  resize = false,
  dimensions = { width: 200, height: 200 }
) {
  const ext = path.extname(originalName);
  const fileName = uuidv4() + ext;
  const outputDir = path.join(__dirname, "..", "public", "images");
  const outputPath = path.join(outputDir, fileName);

  // Ensure directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let image = sharp(fileBuffer);
  if (resize) {
    image = image.resize(dimensions.width, dimensions.height);
  }

  return image
    .toFile(outputPath)
    .then(() => fileName)
    .catch((err) => {
      console.error("❌ Failed to save image:", err);
      throw err;
    });
}

// Delete file by path
function deleteFile(filePath) {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("⚠️ File not found or already deleted:", err);
    } else {
      console.log("🗑️ File deleted:", filePath);
    }
  });
}

module.exports = { upload, saveImage, deleteFile };
