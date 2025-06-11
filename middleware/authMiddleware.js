// ==============================
// middleware/authMiddleware.js — JWT Authentication Middleware
// ==============================
// Verifies JWT tokens and optionally enforces access levels (1: guest, 2: host).
// Integrates with Utils.js for token verification.

const utils = require("../utils/Utils");

/**
 * Authenticates JWT token and optionally checks access level.
 * @param {number} [requiredAccessLevel] - Required access level (1 for guest, 2 for host).
 * @returns {function} Express middleware function.
 */
function authenticateToken(requiredAccessLevel) {
  return (req, res, next) => {
    const authHeader = req.get("Authorization");
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const user = utils.verifyToken(token);
    if (!user) {
      return res.status(403).json({
        message: "Invalid or expired token",
        reason: "Token verification failed",
      });
    }

    if (requiredAccessLevel && user.accessLevel < requiredAccessLevel) {
      return res.status(403).json({ message: "Insufficient access level" });
    }

    req.user = user;
    next();
  };
}

module.exports = authenticateToken;
