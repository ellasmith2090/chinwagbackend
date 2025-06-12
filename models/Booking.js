const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const { updateSeatsFilled } = require("../utils/eventUtils");

const bookingSchema = new Schema(
  {
    guestName: { type: String, required: true, trim: true },
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
    avatar: { type: String, default: "defaultavatar.png" },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, eventId: 1 }, { unique: true });
bookingSchema.index({ eventId: 1 });
bookingSchema.index({ userId: 1 });

// Post-save hook to update seatsFilled when a booking is created
bookingSchema.post("save", async function (doc) {
  try {
    await updateSeatsFilled(doc.eventId);
  } catch (error) {
    console.error("Error updating seatsFilled after booking save:", error);
  }
});

// Post-remove hook to update seatsFilled when a booking is deleted
bookingSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    try {
      await updateSeatsFilled(doc.eventId);
    } catch (error) {
      console.error("Error updating seatsFilled after booking delete:", error);
    }
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
