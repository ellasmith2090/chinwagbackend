// ==============================
// Utils.js — Utility Functions for Security (Password & JWT)
// ==============================

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Utils {
  // Hash Password Function
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto
      .pbkdf2Sync(password, salt, 2048, 32, "sha512")
      .toString("hex");
    return [salt, hash].join("$");
  }

  // Verify Password Function
  verifyPassword(password, original) {
    const [salt, originalHash] = original.split("$");
    const hash = crypto
      .pbkdf2Sync(password, salt, 2048, 32, "sha512")
      .toString("hex");
    return hash === originalHash;
  }

  // Generate JWT with a flattened payload
  generateAccessToken(user) {
    const payload = {
      id: user.id,
      accessLevel: user.accessLevel,
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30m",
    });
  }

  // Verify JWT Token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      return null;
    }
  }
}

module.exports = new Utils();
