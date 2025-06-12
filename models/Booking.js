// =========================
// models/Bookings.js
// =========================
// Defines the Mongoose schema for bookings, linking guests to events.

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Mongoose schema for Booking model.
 * Represents a guest's booking for an event, with references to User and Event.
 */
const bookingSchema = new Schema(
  {
    guestName: {
      type: String,
      required: true,
      trim: true, // Remove whitespace
    },
    contact: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "", // Allows hosts to add notes to guest bookings
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    avatar: {
      type: String, // Filename (e.g., "filename.jpg"), served at /avatars/filename.jpg
      default: "default.png",
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Add indexes for performance
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userId: 1 });

// Create and export the Booking model
module.exports = mongoose.model("Booking", bookingSchema);
