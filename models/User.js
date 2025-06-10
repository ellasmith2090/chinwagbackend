//========================
// Models/User.js
//========================

// Dependencies
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
require("mongoose-type-email");
const Utils = require("./../Utils");

// User Schema Definition
const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
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
    },
    avatar: {
      type: String,
      default: "default.png",
      validate: {
        validator: function (v) {
          return /\.png$/i.test(v); //
        },
        message: (props) => `${props.value} is not a valid PNG file`,
      },
    },
  },
  { timestamps: true }
);

// Middleware to Hash Password Before Saving
userSchema.pre("save", function (next) {
  if (this.password && this.isModified("password")) {
    this.password = Utils.hashPassword(this.password);
  }
  next();
});

// toJSON override: remove password + __v when converting to object
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

// Create and Export Mongoose Model
const userModel = mongoose.model("User", userSchema);
module.exports = userModel;
