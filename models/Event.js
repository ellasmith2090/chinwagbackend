// models/Event.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const eventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    image: {
      type: String,
      default: "defaultevent.png",
    },
    seatsTotal: {
      type: Number,
      required: true,
      min: [1, "Total seats must be at least 1"],
    },
    seatsFilled: {
      type: Number,
      default: 0,
      min: [0, "Filled seats cannot be negative"],
      validate: {
        validator: function (v) {
          return v <= this.seatsTotal;
        },
        message: "Filled seats cannot exceed total seats",
      },
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
  },
  { timestamps: true }
);

// Optional compound index for uniqueness
eventSchema.index({ title: 1, date: 1 }, { unique: true });
// Indexes for performance
eventSchema.index({ hostId: 1 });
eventSchema.index({ date: 1 });

// Pre-save hook to update seatsFilled (example)
eventSchema.pre("save", async function (next) {
  if (this.isModified("bookings")) {
    const Booking = require("../models/Booking");
    const count = await Booking.countDocuments({ _id: { $in: this.bookings } });
    this.seatsFilled = count;
  }
  next();
});

module.exports = mongoose.model("Event", eventSchema);
