// =========================
// routes/user.js
// =========================
// Manages user CRUD operations and avatar uploads.const express = require("express");

const express = require("express");
const router = express.Router();
const User = require("../models/User");
const authenticateToken = require("../middleware/authMiddleware");
const { upload, saveImage } = require("../utils/upload");
const {
  AVATAR_IMAGE_WIDTH,
  AVATAR_IMAGE_HEIGHT,
} = require("../config/constants");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "..", "uploads", "avatars");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("[GET /users/me] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
});

router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user._id.toString() !== req.user.id && req.user.accessLevel !== 2) {
      return res.status(403).json({ message: "Not authorized" });
    }
    res.json(user);
  } catch (err) {
    console.error("[GET /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching user", error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, password, accessLevel } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: "Required fields are missing" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already in use" });

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

router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this user" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    if (req.body.email && req.body.email !== user.email) {
      const existing = await User.findOne({ email: req.body.email });
      if (existing)
        return res.status(400).json({ message: "Email already in use" });
      user.email = req.body.email;
    }
    if (req.body.password) user.password = req.body.password;

    const updated = await user.save();
    res.json(updated.toJSON());
  } catch (err) {
    console.error("[PUT /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error updating user", error: err.message });
  }
});

router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.id !== req.params.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this user" });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.avatar) {
      try {
        await deleteFile(user.avatar, "avatar");
      } catch (delErr) {
        console.warn("[DELETE /users] Cleanup failed:", delErr);
      }
    }

    res.json({ message: "User deleted" });
  } catch (err) {
    console.error("[DELETE /users/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error deleting user", error: err.message });
  }
});

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

      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const oldAvatar = (await User.findById(req.params.id)).avatar;
      const filename = await saveImage(
        req.file.originalname,
        req.file.buffer,
        "avatar",
        true,
        { width: AVATAR_IMAGE_WIDTH, height: AVATAR_IMAGE_HEIGHT }
      );

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { avatar: filename },
        { new: true }
      );

      if (!user) return res.status(404).json({ message: "User not found" });

      if (oldAvatar) {
        try {
          await deleteFile(oldAvatar, "avatar");
        } catch (delErr) {
          console.warn("[PUT /users/:id/avatar] Cleanup failed:", delErr);
        }
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
