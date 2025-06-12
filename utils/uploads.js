// ==============================
// utils/upload.js — Image Upload Handler
// ==============================
// Handles secure disk-based image uploads using Multer and Sharp.
// Resizes images with Sharp, saves to /uploads/avatars or /uploads/events.
// Provides delete functionality. Used for avatars, event photos.

const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(
      null,
      file.fieldname === "avatar" ? "uploads/avatars/" : "uploads/events/"
    );
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const maxSize = 10 * 1024 * 1024; // 10MB

const fileFilter = async (req, file, cb) => {
  const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("❌ Only PNG and JPG image files are allowed"), false);
  }
  try {
    await sharp(file.buffer).metadata(); // Validate image
    cb(null, true);
  } catch (err) {
    cb(new Error("❌ Invalid image file"), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: maxSize },
  fileFilter,
});

/**
 * Saves an image to /uploads/avatars or /uploads/events, optionally resizing.
 * @param {string} originalName - Original filename.
 * @param {Buffer} fileBuffer - Image buffer.
 * @param {string} [type="avatar"] - Type of image
 * @param {boolean} [resize=false] - Whether to resize the image.
 * @param {object} [dimensions={ width: 200, height: 200 }] - dimensions.
 * @returns {Promise<string>} saved filename.
 */
async function saveImage(
  originalName,
  fileBuffer,
  type = "avatar",
  resize = false,
  dimensions = { width: 200, height: 200 }
) {
  const ext = path.extname(originalName).toLowerCase();
  const fileName = `${uuidv4()}${ext}`;
  const outputDir = path.join(
    __dirname,
    "..",
    "uploads",
    type === "avatar" ? "avatars" : "events"
  );
  const outputPath = path.join(outputDir, fileName);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let image = sharp(fileBuffer);
  if (resize) {
    image = image.resize(dimensions.width, dimensions.height, { fit: "cover" });
  }

  try {
    await image.toFile(outputPath);
    return fileName;
  } catch (err) {
    console.error(`❌ Failed to save ${type} image:`, err);
    throw err;
  }
}

/**
 * Deletes an image from /uploads/avatars or /uploads/events.
 * @param {string} fileName - Name of the file to delete.
 * @param {string} [type="avatar"] - Type of image ("avatar" or "event").
 * @returns {Promise<void>}
 */
function deleteFile(fileName, type = "avatar") {
  return new Promise((resolve, reject) => {
    const dir = type === "avatar" ? "avatars" : "events";
    const filePath = path.join(__dirname, "..", "uploads", dir, fileName);
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(`⚠️ Failed to delete ${type} file:`, err);
        reject(err);
      } else {
        console.log(`🗑️ ${type} file deleted: ${fileName}`);
        resolve();
      }
    });
  });
}

module.exports = { upload, saveImage, deleteFile };
