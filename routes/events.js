// ==============================
// routes/events.js — Event routes (CRUD, booking + image upload)
// ==============================

const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const Booking = require("../models/Booking");
const authenticateToken = require("../middleware/authMiddleware");
const {
  EVENT_IMAGE_WIDTH,
  EVENT_IMAGE_HEIGHT,
} = require("../config/constants");

const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

// ==============================
// Image Upload Setup
// ==============================

const uploadsDir = path.join(__dirname, "..", "public", "images");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

// ==============================
// GET all events (public)
// ==============================
router.get("/", async (req, res) => {
  try {
    const events = await Event.find()
      .populate({
        path: "bookings",
        populate: { path: "userId", select: "_id email avatar" },
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

// ==============================
// GET single event by ID
// ==============================
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching event", error: err.message });
  }
});

// ==============================
// GET events by host
// ==============================
router.get("/host/:hostId", async (req, res) => {
  try {
    const events = await Event.find({ hostId: req.params.hostId })
      .populate({
        path: "bookings",
        populate: { path: "userId", select: "avatar" },
      })
      .sort({ date: 1 })
      .lean();

    res.json(events);
  } catch (err) {
    console.error("Error fetching host events:", err);
    res
      .status(500)
      .json({ message: "Error fetching host events", error: err.message });
  }
});

// ==============================
// POST create event
// ==============================
router.post(
  "/",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (req.user.accessLevel !== 2)
        return res
          .status(403)
          .json({ message: "Only hosts can create events" });

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

      const ext = path.extname(req.file.originalname);
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(EVENT_IMAGE_WIDTH, EVENT_IMAGE_HEIGHT)
        .png()
        .toFile(filepath);

      const newEvent = new Event({
        title,
        date: new Date(date),
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

// ==============================
// PUT update event image
// ==============================
router.put(
  "/:id/image",
  authenticateToken,
  upload.single("image"),
  async (req, res) => {
    try {
      if (req.user.accessLevel !== 2)
        return res
          .status(403)
          .json({ message: "Only hosts can update event images" });

      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });

      const filename = `${req.params.id}-${Date.now()}.png`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(EVENT_IMAGE_WIDTH, EVENT_IMAGE_HEIGHT)
        .png()
        .toFile(filepath);

      const updated = await Event.findByIdAndUpdate(
        req.params.id,
        { image: filename },
        { new: true }
      );

      res.json({ message: "Image uploaded", image: filename, event: updated });
    } catch (err) {
      console.error("[PUT /:id/image] Error:", err);
      res
        .status(500)
        .json({ message: "Image upload failed", error: err.message });
    }
  }
);

// ==============================
// PUT update event (details)
// ==============================
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.accessLevel !== 2)
      return res.status(403).json({ message: "Only hosts can update events" });

    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (err) {
    console.error("[PUT /:id] Error:", err);
    res
      .status(500)
      .json({ message: "Error updating event", error: err.message });
  }
});

// ==============================
// DELETE event
// ==============================
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (req.user.accessLevel !== 2)
      return res.status(403).json({ message: "Only hosts can delete events" });

    const result = await Event.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("[DELETE event] Error:", err);
    res
      .status(500)
      .json({ message: "Error deleting event", error: err.message });
  }
});

// ==============================
// POST book an event
// ==============================
router.post("/:id/book", authenticateToken, async (req, res) => {
  try {
    const { guestName, contact, notes } = req.body;

    if (!guestName || !contact)
      return res
        .status(400)
        .json({ message: "Guest name and contact are required." });

    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const alreadyBooked = event.bookings.some(
      (booking) =>
        booking.contact === contact || booking.guestName === guestName
    );
    if (alreadyBooked) {
      return res
        .status(400)
        .json({ message: "You have already booked this event." });
    }

    if (event.seatsFilled >= event.seatsTotal)
      return res.status(400).json({ message: "Event is full" });

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
      event: updatedEvent, // Include updated event with correct seatsFilled
    });
  } catch (err) {
    console.error("[POST /:id/book] Error:", err);
    res
      .status(500)
      .json({ message: "Error processing booking", error: err.message });
  }
});

// ==============================
// DELETE a booking (host only or admin)
// ==============================
router.delete(
  "/event/:eventId/bookings/:bookingId",
  authenticateToken,
  async (req, res) => {
    try {
      const { eventId, bookingId } = req.params;

      const booking = await Booking.findByIdAndDelete(bookingId);
      if (!booking)
        return res.status(404).json({ message: "Booking not found" });

      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });

      // Remove booking from event
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
