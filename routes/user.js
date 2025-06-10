//===================
// routes/user.js
//===================

const express = require("express");
const router = express.Router();
const User = require("./../models/User");
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
const upload = multer({ storage });

// GET - all users
router.get("/", (req, res) => {
  User.find()
    .then((users) => res.json(users))
    .catch((err) => {
      console.error("problem getting users", err);
      res.status(500).json({ message: "problem getting users", error: err });
    });
});

// GET - single user by id
router.get("/:id", (req, res) => {
  User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User doesn't exist" });
      }
      res.json(user);
    })
    .catch((err) => {
      console.error("error getting user", err);
      res.status(500).json({ message: "problem getting user", error: err });
    });
});

// POST - create a new user
router.post("/", (req, res) => {
  if (!req.body) {
    return res.status(400).json({ message: "User content is empty!" });
  }

  User.findOne({ email: req.body.email })
    .then((existingUser) => {
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const newUser = new User({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        accessLevel: req.body.accessLevel || 1,
        password: req.body.password,
      });

      newUser
        .save()
        .then((user) => res.status(201).json(user))
        .catch((err) => {
          console.error("error creating user", err);
          res
            .status(500)
            .json({ message: "problem creating user", error: err });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Problem creating account", error: err });
    });
});

// PUT - update a user
router.put("/:id", authenticateToken, async (req, res) => {
  try {
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

    res.json({
      id: updated._id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      accessLevel: updated.accessLevel,
      avatar: updated.avatar,
    });
  } catch (err) {
    console.error("error updating user", err);
    res.status(500).json({ message: "problem updating user", error: err });
  }
});

// DELETE - delete user
router.delete("/:id", authenticateToken, (req, res) => {
  if (!req.params.id) {
    return res.status(400).json({ message: "User id is missing!" });
  }

  User.findByIdAndDelete({ _id: req.params.id })
    .then(() => res.json({ message: "User deleted" }))
    .catch((err) => {
      console.error("error deleting user", err);
      res.status(500).json({ message: "problem deleting user", error: err });
    });
});

// PUT - Upload Avatar
router.put(
  "/:id/avatar",
  authenticateToken,
  upload.single("avatar"),
  async (req, res) => {
    try {
      const userId = req.params.id;

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const uploadPath = path.join(__dirname, "..", "public", "images");

      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const filename = `${userId}-${Date.now()}.png`;
      const filepath = path.join(uploadPath, filename);

      await sharp(req.file.buffer)
        .resize(AVATAR_IMAGE_WIDTH, AVATAR_IMAGE_HEIGHT)
        .png()
        .toFile(filepath);

      const user = await User.findByIdAndUpdate(
        userId,
        { avatar: filename },
        { new: true }
      );

      res.json({
        message: "Avatar uploaded successfully",
        avatar: filename,
        user,
      });
    } catch (err) {
      console.error("error uploading avatar", err);
      res.status(500).json({ message: "Error uploading avatar", error: err });
    }
  }
);

module.exports = router;
