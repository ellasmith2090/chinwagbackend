// =========================
// routes/events.js
// =========================
// Manages event CRUD operations, booking, and image uploads.
const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const authenticateToken = require("../middleware/authMiddleware");
const { upload, saveImage, deleteFile } = require("../utils/upload");
const {
  EVENT_IMAGE_WIDTH,
  EVENT_IMAGE_HEIGHT,
} = require("../config/constants");
const path = require("path");
const fs = require("fs");

const uploadsDir = path.join(__dirname, "..", "uploads", "events");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

router.get("/", async (req, res) => {
  try {
    const events = await Event.find()
      .populate({
        path: "bookings",
        populate: { path: "userId", select: "firstName lastName email avatar" },
      })
      .sort({ date: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    console.error("[GET /events] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching events", error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate({
        path: "bookings",
        populate: { path: "userId", select: "firstName lastName email avatar" },
      })
      .lean();

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  } catch (err) {
    console.error("[GET /events/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching event", error: err.message });
  }
});

router.get("/host/:hostId", async (req, res) => {
  try {
    const events = await Event.find({ hostId: req.params.hostId })
      .populate({
        path: "bookings",
        populate: { path: "userId", select: "firstName lastName email avatar" },
      })
      .sort({ date: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    console.error("[GET /events/host/:hostId] Error:", err);
    res
      .status(500)
      .json({ message: "Error fetching host events", error: err.message });
  }
});

router.post(
  "/",
  authenticateToken(2),
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, date, address, description, seatsTotal } = req.body;
      if (
        !title ||
        !date ||
        !address ||
        !description ||
        !seatsTotal ||
        !req.file
      ) {
        return res
          .status(400)
          .json({ message: "All fields are required including an image" });
      }

      const eventDate = new Date(date);
      if (isNaN(eventDate) || eventDate <= new Date()) {
        return res.status(400).json({ message: "Date must be in the future" });
      }

      const filename = await saveImage(
        req.file.originalname,
        req.file.buffer,
        "event",
        true,
        { width: EVENT_IMAGE_WIDTH, height: EVENT_IMAGE_HEIGHT }
      );

      const newEvent = new Event({
        title,
        date: eventDate,
        address,
        description,
        image: filename,
        seatsTotal: parseInt(seatsTotal),
        hostId: req.user.id,
        bookings: [],
        seatsFilled: 0,
      });

      const saved = await newEvent.save();
      res.status(201).json(saved);
    } catch (err) {
      console.error("[POST /events] Error:", err);
      res
        .status(500)
        .json({ message: "Error creating event", error: err.message });
    }
  }
);

router.put(
  "/:id/image",
  authenticateToken(2),
  upload.single("image"),
  async (req, res) => {
    try {
      const event = await Event.findById(req.params.id);
      if (!event) return res.status(404).json({ message: "Event not found" });
      if (event.hostId.toString() !== req.user.id) {
        return res
          .status(403)
          .json({ message: "Not authorized to update this event" });
      }

      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const oldImage = event.image;
      const filename = await saveImage(
        req.file.originalname,
        req.file.buffer,
        "event",
        true,
        { width: EVENT_IMAGE_WIDTH, height: EVENT_IMAGE_HEIGHT }
      );

      event.image = filename;
      const updated = await event.save();

      if (oldImage) {
        try {
          await deleteFile(oldImage, "event");
        } catch (delErr) {
          console.warn("[DELETE /events/image] Cleanup failed:", delErr);
        }
      }

      res.json({ message: "Image uploaded", image: filename, event: updated });
    } catch (err) {
      console.error("[PUT /events/:id/image] Error:", err);
      res
        .status(500)
        .json({ message: "Image upload failed", error: err.message });
    }
  }
);

router.put("/:id", authenticateToken(2), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.hostId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this event" });
    }

    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    console.error("[PUT /events/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error updating event", error: err.message });
  }
});

router.delete("/:id", authenticateToken(2), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.hostId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this event" });
    }

    if (event.image) {
      try {
        await deleteFile(event.image, "event");
      } catch (delErr) {
        console.warn("[DELETE /events] Cleanup failed:", delErr);
      }
    }

    await event.deleteOne();
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("[DELETE /events/:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error deleting event", error: err.message });
  }
});

router.post("/:id/book", authenticateToken, async (req, res) => {
  try {
    const { guestName, contact, notes } = req.body;
    if (!guestName || !contact) {
      return res
        .status(400)
        .json({ message: "Guest name and contact are required" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const alreadyBooked = await Booking.findOne({
      eventId: event._id,
      userId: req.user.id,
    });
    if (alreadyBooked) {
      return res
        .status(400)
        .json({ message: "You have already booked this event" });
    }

    if (event.seatsFilled >= event.seatsTotal) {
      return res.status(400).json({ message: "Event is full" });
    }

    const newBooking = new Booking({
      guestName,
      contact,
      notes,
      eventId: event._id,
      userId: req.user.id,
    });
    await newBooking.save();

    event.bookings.push(newBooking._id);
    event.seatsFilled += 1;
    await event.save();

    const updatedEvent = await Event.findById(event._id).lean();

    res.json({
      message: "Booking successful",
      booking: newBooking,
      event: updatedEvent,
    });
  } catch (err) {
    console.error("[POST /events/:id/book] Error:", err);
    res
      .status(500)
      .json({ message: "Error processing booking", error: err.message });
  }
});

module.exports = router;
