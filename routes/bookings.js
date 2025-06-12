// =========================
// routes/bookings.js
// =========================
// Manages booking CRUD operations.
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const authenticateToken = require("../middleware/authMiddleware");

const updateEventAfterBookingChange = async (eventId, bookingId, action) => {
  const event = await Event.findById(eventId);
  if (event) {
    event.bookings = event.bookings.filter((b) => b.toString() !== bookingId);
    event.seatsFilled = Math.max(
      0,
      event.seatsFilled + (action === "delete" ? -1 : 0)
    );
    await event.save();
  }
};

router.get("/:eventId/bookings", async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate({
      path: "bookings",
      populate: { path: "userId", select: "firstName lastName email avatar" },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event.bookings);
  } catch (err) {
    console.error("[GET /bookings] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching bookings", error: err.message });
  }
});

router.put(
  "/:eventId/bookings/:bookingId/note",
  authenticateToken(2),
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;
      const { notes } = req.body;

      if (notes && notes.length > 500) {
        return res
          .status(400)
          .json({ message: "Notes cannot exceed 500 characters" });
      }

      const event = await Event.findById(eventId);
      if (!event || event.hostId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      booking.notes = notes || booking.notes;
      await booking.save();

      res.json({ message: "Note updated", booking });
    } catch (err) {
      console.error("[PUT /note] Error:", err);
      res
        .status(500)
        .json({ message: "Error updating booking", error: err.message });
    }
  }
);

router.delete("/:bookingId", authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this booking" });
    }

    await updateEventAfterBookingChange(booking.eventId, booking._id, "delete");
    await booking.deleteOne();

    res.json({ message: "Booking cancelled" });
  } catch (err) {
    console.error("[DELETE /booking] Error:", err);
    res
      .status(500)
      .json({ message: "Failed to cancel booking", error: err.message });
  }
});

router.delete(
  "/:eventId/bookings/:bookingId",
  authenticateToken(2),
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;

      const event = await Event.findById(eventId);
      if (!event || event.hostId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await updateEventAfterBookingChange(eventId, bookingId, "delete");
      const booking = await Booking.findByIdAndDelete(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      res.json({ message: "Booking removed" });
    } catch (err) {
      console.error("[DELETE /booking] Error:", err);
      res
        .status(500)
        .json({ message: "Error removing booking", error: err.message });
    }
  }
);

module.exports = router;
