//========================
// routes/bookings.js
//========================

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const authenticateToken = require("../middleware/authMiddleware");

// POST - Create a booking
router.post("/:eventId/book", authenticateToken, async (req, res) => {
  const { guestName, contact, notes, avatar } = req.body;
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.seatsFilled >= event.seatsTotal) {
      return res.status(400).json({ message: "Event is already full" });
    }

    const userId = req.user.id;

    const newBooking = new Booking({
      guestName,
      contact,
      notes,
      avatar,
      eventId,
      userId,
    });

    await newBooking.save();

    event.bookings.push(newBooking._id);
    event.seatsFilled += 1;
    await event.save();

    res.status(201).json(newBooking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating booking", error: err });
  }
});

// GET - Get all bookings for a specific event
router.get("/:eventId/bookings", async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate({
      path: "bookings",
      populate: {
        path: "userId",
        select: "avatar email _id",
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(event.bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching bookings", error: err });
  }
});

// PUT - Update booking notes
router.put(
  "/:eventId/bookings/:bookingId/note",
  authenticateToken,
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { notes } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      booking.notes = notes;
      await booking.save();

      res.json({ message: "Note updated", booking });
    } catch (err) {
      console.error("[PUT booking note] Error:", err);
      res
        .status(500)
        .json({ message: "Error updating booking", error: err.message });
    }
  }
);

// DELETE - Remove booking
router.delete(
  "/:eventId/bookings/:bookingId",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;

      const booking = await Booking.findByIdAndDelete(bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      event.bookings = event.bookings.filter((b) => b.toString() !== bookingId);
      event.seatsFilled = Math.max(0, event.seatsFilled - 1);
      await event.save();

      res.json({ message: "Booking removed" });
    } catch (err) {
      console.error("[DELETE booking] Error:", err);
      res
        .status(500)
        .json({ message: "Error removing booking", error: err.message });
    }
  }
);

module.exports = router;
