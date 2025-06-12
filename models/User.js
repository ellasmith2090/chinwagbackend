// =========================
// models/User.js
// =========================
// Defines the Mongoose schema for users (guests and hosts).

const mongoose = require("mongoose");
const Schema = mongoose.Schema;
require("mongoose-type-email");
const Utils = require("../utils/Utils");

/**
 * Mongoose schema for User model.
 * Represents guest or host accounts with authentication and profile data.
 */
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: mongoose.SchemaTypes.Email,
      required: true,
      unique: true,
    },
    accessLevel: {
      type: Number,
      required: true,
      enum: [1, 2], // 1 = Guest, 2 = Host
      default: 1,
    },
    password: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Bio cannot exceed 500 characters"],
    },
    avatar: {
      type: String, // Filename (e.g., "filename.jpg"), served at /avatars/filename.jpg
      default: "default.png",
      validate: {
        validator: function (v) {
          return /\.(png|jpg|jpeg)$/i.test(v);
        },
        message: (props) => `${props.value} is not a valid PNG or JPG file`,
      },
    },
  },
  { timestamps: true }
);

// Middleware to hash password before saving
userSchema.pre("save", function (next) {
  if (this.password && this.isModified("password")) {
    try {
      this.password = Utils.hashPassword(this.password);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

// toJSON override: remove password and __v
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// Add indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ accessLevel: 1 });

// Create and export the User model
module.exports = mongoose.model("User", userSchema);
