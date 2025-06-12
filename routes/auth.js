// =========================
// routes/auth.js
// =========================
// Handles user authentication and token validation.

const express = require("express");
const router = express.Router();
const Utils = require("../utils/Utils");
const User = require("../models/User");

/**
 * POST /api/auth/signin - User login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} JWT token and user data
 */
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!Utils.verifyPassword(password, user.password)) {
      return res.status(401).json({ message: "Incorrect password" });
    }

    const userObject = {
      id: user._id,
      accessLevel: user.accessLevel,
    };

    const accessToken = Utils.generateAccessToken(userObject);

    res.json({
      accessToken,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accessLevel: user.accessLevel,
      },
    });
  } catch (err) {
    console.error("[POST /signin] Error:", err);
    res.status(500).json({ message: "Problem signing in", error: err.message });
  }
});

/**
 * GET /api/auth/validate - Validate JWT and return user
 * @param {string} authorization - Bearer token in header
 * @returns {object} User data
 */
router.get("/validate", async (req, res) => {
  const token = req.get("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = Utils.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accessLevel: user.accessLevel,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("[GET /validate] Error:", err);
    res.status(403).json({ message: "Invalid token", error: err.message });
  }
});

/**
 * GET /api/auth/check - Check session validity and return user
 * @param {string} authorization - Bearer token in header
 * @returns {object} User data
 */
router.get("/check", async (req, res) => {
  const token = req.get("Authorization")?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = Utils.verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ message: "Invalid token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        accessLevel: user.accessLevel,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error("[GET /check] Error:", err);
    res.status(403).json({ message: "Invalid token", error: err.message });
  }
});

module.exports = router;
