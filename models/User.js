// models/User.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
require("mongoose-type-email");
const Utils = require("../utils/Utils");

const userSchema = new Schema(
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
      type: String,
      default: "defaultavatar.png",
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

userSchema.pre("save", async function (next) {
  if (this.password && this.isModified("password")) {
    try {
      this.password = await Utils.hashPassword(this.password);
      next();
    } catch (err) {
      next(err);
    }
  } else {
    next();
  }
});

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

userSchema.index({ email: 1 });
userSchema.index({ accessLevel: 1 });

module.exports = mongoose.model("User", userSchema);
