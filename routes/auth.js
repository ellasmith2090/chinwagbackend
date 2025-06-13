const express = require("express");
const router = express.Router();
const Utils = require("../utils/authUtils"); // Updated import assuming renaming from utils.js to authUtils.js
const User = require("../models/User");

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    // Debug logs removed or made conditional (uncomment for development if needed)
    // if (process.env.NODE_ENV === "development") console.log("Attempting to find user:", email);
    const user = await User.findOne({ email }).lean();
    // if (process.env.NODE_ENV === "development") console.log("User found:", user ? "yes" : "no");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!(await Utils.verifyPassword(password, user.password))) {
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
    res
      .status(500)
      .json({ message: "Server error validating token", error: err.message });
  }
});

module.exports = router;
