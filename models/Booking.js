// models/Booking.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const bookingSchema = new Schema(
  {
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      validate: {
        validator: function (v) {
          return (
            /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(v) ||
            /^\+?[\d\s-]{10,}$/.test(v)
          );
        },
        message: "Contact must be a valid email or phone number",
      },
    },
    notes: {
      type: String,
      default: "",
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    avatar: {
      type: String,
      default: "/uploads/avatars/defaultavatar.png",
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

// Compound index to prevent duplicate bookings
bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });
// Additional indexes for performance
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userId: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
