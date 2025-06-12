const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Utils {
  constructor() {
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
    }
  }

  async hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 2048, 32, "sha512", (err, hash) => {
        if (err) reject(err);
        resolve([salt, hash.toString("hex")].join("$"));
      });
    });
  }

  async verifyPassword(password, original) {
    const [salt, originalHash] = original.split("$");
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 2048, 32, "sha512", (err, hash) => {
        if (err) reject(err);
        resolve(hash.toString("hex") === originalHash);
      });
    });
  }

  generateAccessToken(user) {
    const accessLevel = user.accessLevel || 1;
    if (![1, 2].includes(accessLevel)) {
      throw new Error("Invalid accessLevel: must be 1 (user) or 2 (admin)");
    }
    const payload = {
      _id: user._id,
      accessLevel,
    };
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "30m",
    });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      console.error(
        `JWT verification failed: ${error.name} - ${error.message}`
      );
      return null;
    }
  }
}

const utils = new Utils();
module.exports = utils;
