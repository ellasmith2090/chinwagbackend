// utils.js

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

if (!process.env.ACCESS_TOKEN_SECRET) {
  throw new Error("ACCESS_TOKEN_SECRET environment variable is not set");
}

module.exports = {
  hashPassword: async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  },
  verifyPassword: async (password, hash) =>
    await bcrypt.compare(password, hash),
  generateAccessToken: (user) => {
    const accessLevel = user.accessLevel || 1;
    if (![1, 2].includes(accessLevel)) {
      throw new Error("Invalid accessLevel: must be 1 (guest) or 2 (host)");
    }
    return jwt.sign(
      { _id: user._id, accessLevel, iat: Math.floor(Date.now() / 1000) },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );
  },
  verifyToken: (token) => {
    try {
      return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      console.error(
        `JWT verification failed: ${error.name} - ${error.message}`
      );
      return { error: error.message };
    }
  },
};
