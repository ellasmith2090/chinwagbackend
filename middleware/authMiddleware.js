// middleware/authMiddleware.js
const utils = require("../utils/authUtils");

function authenticateToken(requiredAccessLevel) {
  return (req, res, next) => {
    const authHeader = req.get("Authorization");
    let token = authHeader && authHeader.split(" ")[1];

    if (!token || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No valid token provided" });
    }

    try {
      const user = utils.verifyToken(token);
      if (!user || !user.accessLevel) {
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
    } catch (err) {
      return res.status(500).json({
        message: "Server error during token verification",
        error: err.message,
      });
    }
  };
}

module.exports = authenticateToken;
