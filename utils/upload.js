// utils/upload.js
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

function deleteFile(fileName, type = "avatar") {
  return new Promise((resolve, reject) => {
    const dir = type === "avatar" ? "avatars" : "events";
    const filePath = path.join(__dirname, "..", "uploads", dir, fileName);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) {
        console.warn(`⚠️ ${type} file not found: ${fileName}`);
        return resolve(); // Resolve without error if file doesn't exist
      }
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
  });
}

module.exports = { upload, saveImage, deleteFile };
