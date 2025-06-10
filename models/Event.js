//==========================
//models Event.js
//==========================
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Event Schema Definition
const eventSchema = new Schema(
  {
    title: { type: String, required: true },
    date: { type: Date, required: true },
    address: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, default: "default-event.png" },
    seatsFilled: { type: Number, default: 0 },
    seatsTotal: { type: Number, required: true },
    hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bookings: [
      {
        type: Schema.Types.ObjectId,
        ref: "Booking", // Reference to the Booking model
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
