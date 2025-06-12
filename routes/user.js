// =========================
// routes/user.js
// =========================
// Manages user CRUD operations and avatar uploads.

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const authenticateToken = require("../middleware/authMiddleware");
const {
  AVATAR_IMAGE_WIDTH,
  AVATAR_IMAGE_HEIGHT,
} = require("../config/constants");

// Setup Multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/image\/(png|jpg|jpeg)/)) {
      return cb(new Error("Only PNG or JPG images are allowed"), false);
    }
    cb(null, true);
  },
});

// Setup upload directory
const uploadsDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

/**
 * GET /api/users/me - Get current user's data
 * @returns {object} Current user data
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("[GET /users/me] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
});

/**
 * GET /api/users/:id - Get user by ID
 * @param {string} id - User ID
 * @returns {object} User data
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -__v");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error("[GET /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
});

/**
 * POST /api/users - Create a new user
 * @param {object} body - User details (firstName, lastName, email, password, accessLevel)
 * @returns {object} Created user
 */
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, password, accessLevel } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      accessLevel: accessLevel || 1,
    });

    const savedUser = await newUser.save();
    res.status(201).json(savedUser.toJSON());
  } catch (err) {
    console.error("[POST /users] Error:", err);
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
});

/**
 * PUT /api/users/:id - Update user details
 * @param {string} id - User ID
 * @param {object} body - Updated user details
 * @returns {object} Updated user
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this user" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updated = await user.save();
    res.json(updated.toJSON());
  } catch (err) {
    console.error("[PUT /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
  }
});

/**
 * DELETE /api/users/:id - Delete user
 * @param {string} id - User ID
 * @returns {object} Success message
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this user" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("[DELETE /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
});

/**
 * PUT /api/users/:id/avatar - Upload user avatar
 * @param {string} id - User ID
 * @param {file} avatar - Avatar image
 * @returns {object} Updated user with avatar
 */
router.put(
  "/:id/avatar",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      if (req.user.id !== req.params.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this user" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const filename = `${req.params.id}-${Date.now()}.png`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(AVATAR_IMAGE_WIDTH, AVATAR_IMAGE_HEIGHT)
        .toFile(filepath);

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { avatar: filename },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "Avatar uploaded successfully",
        avatar: filename,
        user: user.toJSON(),
      });
    } catch (err) {
      console.error("[PUT /users/:id/avatar] Error:", err);
      res
        .status(500)
        .json({ message: "Error uploading avatar", error: err.message });
    }
  }
);

module.exports = router;
