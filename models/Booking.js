//========================
// models/Bookings.js
//========================

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Booking Schema Definition
const bookingSchema = new Schema(
  {
    guestName: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    avatar: {
      type: String, // Path to avatar image (could be stored as filename or URL)
      default: "default.png",
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event", // Reference to the Event model
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (optional if needed)
      required: true,
    },
  },
  { timestamps: true }
);

// Create and export the Booking model
module.exports = mongoose.model("Booking", bookingSchema);
