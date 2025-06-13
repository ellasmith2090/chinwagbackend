// utils/eventUtils.js
const Event = require("../models/Event");
const Booking = require("../models/Booking");

async function updateSeatsFilled(eventId) {
  try {
    const event = await Event.findById(eventId);
    if (event) {
      const count = await Booking.countDocuments({ eventId });
      event.seatsFilled = count;
      await event.save();
    }
  } catch (error) {
    console.error(`Error updating seatsFilled for event ${eventId}:`, error);
    throw error; // Propagate error for handling in routes
  }
}

module.exports = { updateSeatsFilled };
