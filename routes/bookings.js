// =========================
// routes/bookings.js
// =========================
// Manages booking CRUD operations.

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const authenticateToken = require("../middleware/authMiddleware");

/**
 * GET /api/bookings/:eventId/bookings - Get all bookings for an event
 * @returns {array} Bookings with user data
 */
router.get("/:eventId/bookings", async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate({
      path: "bookings",
      populate: {
        path: "userId",
        select: "firstName lastName email avatar",
      },
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

/**
 * PUT /api/bookings/:eventId/bookings/:bookingId/note - Update booking notes (host only)
 * @param {string} notes - Updated notes
 * @returns {object} Updated booking
 */
router.put(
  "/:eventId/bookings/:bookingId/note",
  authenticateToken(2),
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;
      const { notes } = req.body;

      const event = await Event.findById(eventId);
      if (!event || event.hostId.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const booking = await Booking.findById(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      booking.notes = notes;
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

/**
 * DELETE /api/bookings/:bookingId - Cancel booking (guest)
 * @returns {object} Success message
 */
router.delete("/:bookingId", authenticateToken, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to cancel this booking" });
    }

    const event = await Event.findById(booking.eventId);
    if (event) {
      event.bookings = event.bookings.filter(
        (b) => b.toString() !== booking._id.toString()
      );
      event.seatsFilled = Math.max(0, event.seatsFilled - 1);
      await event.save();
    }

    await booking.deleteOne();
    res.json({ message: "Booking cancelled" });
  } catch (err) {
    console.error("[DELETE /booking] Error:", err);
    res
      .status(500)
      .json({ message: "Failed to cancel booking", error: err.message });
  }
});

/**
 * DELETE /api/bookings/:eventId/bookings/:bookingId - Remove booking (host)
 * @returns {object} Success message
 */
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

      const booking = await Booking.findByIdAndDelete(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      event.bookings = event.bookings.filter((b) => b.toString() !== bookingId);
      event.seatsFilled = Math.max(0, event.seatsFilled - 1);
      await event.save();

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
