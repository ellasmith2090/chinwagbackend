const crypto = require("crypto");
const jwt = require("jsonwebtoken");

class Utils {
  /**
   * Initializes Utils and validates environment variables.
   * @throws {Error} If ACCESS_TOKEN_SECRET is not set.
   */
  constructor() {
    if (!process.env.ACCESS_TOKEN_SECRET) {
      throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
    }
  }

  /**
   * Hashes a password using PBKDF2 with a random salt.
   * @param {string} password - The plaintext password to hash.
   * @returns {Promise<string>} The salt and hash joined by `$` (e.g., `salt$hash`).
   */
  async hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 2048, 32, "sha512", (err, hash) => {
        if (err) reject(err);
        resolve([salt, hash.toString("hex")].join("$"));
      });
    });
  }

  /**
   * Verifies a password against a stored hash.
   * @param {string} password - The plaintext password to verify.
   * @param {string} original - The stored salt and hash (e.g., `salt$hash`).
   * @returns {Promise<boolean>} True if the password matches, false otherwise.
   */
  async verifyPassword(password, original) {
    const [salt, originalHash] = original.split("$");
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 2048, 32, "sha512", (err, hash) => {
        if (err) reject(err);
        resolve(hash.toString("hex") === originalHash);
      });
    });
  }

  /**
   * Generates a JWT access token for a user.
   * @param {object} user - The user object with _id and accessLevel (1 for user, 2 for admin).
   * @returns {string} The signed JWT token.
   * @throws {Error} If accessLevel is not 1 or 2.
   */
  generateAccessToken(user) {
    const accessLevel = user.accessLevel || 1; // Default to user
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

  /**
   * Verifies a JWT token.
   * @param {string} token - The JWT token to verify.
   * @returns {object|null} The decoded payload if valid, null if invalid.
   */
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
