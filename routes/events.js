// =========================
// routes/events.js
// =========================
// Manages event CRUD operations, booking, and image uploads.

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

// Image Upload Setup
const uploadsDir = path.join(__dirname, "..", "uploads", "events");
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

/**
 * GET /api/events - Get all events (public)
 * @returns {array} List of events with bookings and user data
 */
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

/**
 * GET /api/events/:id - Get single event by ID
 * @param {string} id - Event ID
 * @returns {object} Event with bookings and user data
 */
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

/**
 * GET /api/events/host/:hostId - Get events by host
 * @param {string} hostId - Host user ID
 * @returns {array} List of host's events
 */
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

/**
 * POST /api/events - Create event (host only)
 * @param {object} body - Event details (title, date, address, description, seatsTotal)
 * @param {file} image - Event image
 * @returns {object} Created event
 */
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

      const ext = path.extname(req.file.originalname).toLowerCase();
      const filename = `${uuidv4()}${ext}`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(EVENT_IMAGE_WIDTH, EVENT_IMAGE_HEIGHT)
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

/**
 * PUT /api/events/:id/image - Update event image (host only)
 * @param {string} id - Event ID
 * @param {file} image - New event image
 * @returns {object} Updated event
 */
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

      const filename = `${req.params.id}-${Date.now()}.png`;
      const filepath = path.join(uploadsDir, filename);

      await sharp(req.file.buffer)
        .resize(EVENT_IMAGE_WIDTH, EVENT_IMAGE_HEIGHT)
        .toFile(filepath);

      event.image = filename;
      const updated = await event.save();

      res.json({ message: "Image uploaded", image: filename, event: updated });
    } catch (err) {
      console.error("[PUT /events/:id/image] Error:", err);
      res
        .status(500)
        .json({ message: "Image upload failed", error: err.message });
    }
  }
);

/**
 * PUT /api/events/:id - Update event details (host only)
 * @param {string} id - Event ID
 * @param {object} body - Updated event details
 * @returns {object} Updated event
 */
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

/**
 * DELETE /api/events/:id - Delete event (host only)
 * @param {string} id - Event ID
 * @returns {object} Success message
 */
router.delete("/:id", authenticateToken(2), async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.hostId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to delete this event" });
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

/**
 * POST /api/events/:id/book - Book an event
 * @param {string} id - Event ID
 * @param {object} body - Booking details (guestName, contact, notes)
 * @returns {object} Booking and updated event
 */
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
