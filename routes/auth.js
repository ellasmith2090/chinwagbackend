//======================
//routes/auth.js
//======================

require("dotenv").config();
const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const Utils = require("../Utils");
const User = require("./../models/User");

// POST /auth/signin — User Login
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User doesn't exist" });
    }

    if (!Utils.verifyPassword(password, user.password)) {
      return res.status(400).json({ message: "Password / email is incorrect" });
    }

    const userObject = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      accessLevel: user.accessLevel,
    };

    const accessToken = Utils.generateAccessToken(userObject);

    res.json({
      accessToken,
      user: userObject,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Problem signing in", error: err });
  }
});

// GET /auth/validate — Validate token & return user
router.get("/validate", async (req, res) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authorization token is missing" });
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // decoded contains: { id, accessLevel, iat, exp }
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
  } catch (error) {
    console.error("Token validation error:", error);
    res.status(403).json({ message: "Invalid token" });
  }
});

module.exports = router;
