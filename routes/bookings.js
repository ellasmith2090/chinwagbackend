// ==============================
// routes/bookings.js — Booking routes (Create, Read, Update, Delete)
// ==============================

const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const Event = require("../models/Event");
const authenticateToken = require("../middleware/authMiddleware");

// ==============================
// POST - Create a booking
// ==============================
router.post("/:eventId/book", authenticateToken, async (req, res) => {
  const { guestName, contact, notes, avatar } = req.body;
  const { eventId } = req.params;

  try {
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

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

// ==============================
// GET - All bookings for an event (with user data)
// ==============================
router.get("/:eventId/bookings", async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).populate({
      path: "bookings",
      populate: {
        path: "userId",
        select: "firstName lastName email avatar", // ✅ Ensures consistent profile data
      },
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event.bookings);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "Error fetching bookings", error: err.message });
  }
});

// ==============================
// PUT - Update booking notes
// ==============================
router.put(
  "/:eventId/bookings/:bookingId/note",
  authenticateToken,
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const { notes } = req.body;

      const booking = await Booking.findById(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

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
// ==============================
// DELETE - Guest booking
// ==============================
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
    console.error("[Guest Cancel Booking] Error:", err);
    res
      .status(500)
      .json({ message: "Failed to cancel booking", error: err.message });
  }
});

// ==============================
// DELETE - Remove a booking (host)
// ==============================
router.delete(
  "/:eventId/bookings/:bookingId",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;

      const booking = await Booking.findByIdAndDelete(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });

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
