// =========================
// seedEvents.js
// =========================
// Seeds demo events, users, and bookings for Chinwag Events.

const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs").promises;
const User = require("../models/User");
const Event = require("../models/Event");
const Booking = require("../models/Booking");

dotenv.config({ path: path.join(__dirname, ".env") });

// Ensure upload directory exists
const uploadsDir = path.join(__dirname, "uploads", "events");
async function ensureUploadsDir() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.error("❌ Failed to create uploads directory", err);
  }
}

// Copy demo images to uploads/events
async function copyDemoImages() {
  const demoImages = [
    "coffeechitchat.png",
    "mezzemonday.png",
    "socialsaturday.png",
  ];
  const sourceDir = path.join(__dirname, "demo-images"); // Store images here

  try {
    for (const image of demoImages) {
      const sourcePath = path.join(sourceDir, image);
      const destPath = path.join(uploadsDir, image);
      try {
        await fs.access(sourcePath); // Check if source exists
        await fs.copyFile(sourcePath, destPath);
        console.log(`📸 Copied ${image} to uploads/events`);
      } catch (err) {
        console.warn(`⚠️ ${image} not found in demo-images; ensure it exists`);
      }
    }
  } catch (err) {
    console.error("❌ Error copying demo images", err);
  }
}

// Seed database
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    // Clear old data
    await Promise.all([
      User.deleteMany({
        email: { $in: ["host@chinwag.com", "guest@chinwag.com"] },
      }),
      Event.deleteMany({}),
      Booking.deleteMany({}),
    ]);
    console.log("🧹 Old users, events, and bookings cleared");

    // Seed demo users
    const hostUser = await User.create({
      firstName: "Demo",
      lastName: "Host",
      email: "host@chinwag.com",
      password: "Host123!",
      accessLevel: 2,
      avatar: "default.png",
    });
    const guestUser = await User.create({
      firstName: "Demo",
      lastName: "Guest",
      email: "guest@chinwag.com",
      password: "Guest123!",
      accessLevel: 1,
      avatar: "default.png",
    });
    console.log("👤 Demo users created (host, guest)");

    // Copy demo images
    await ensureUploadsDir();
    await copyDemoImages();

    // Seed demo events
    const demoEvents = await Event.insertMany([
      {
        title: "Coffee Chit Chat",
        description:
          "A friendly nook for casual conversations and warm sips, Coffee Chit Chat is your Sunday slow-down with a social twist.",
        address: "12 Brew Street, Chatfield, VIC 3051",
        date: new Date("2025-06-28T10:00:00"),
        image: "coffeechitchat.png",
        seatsTotal: 15,
        seatsFilled: 0,
        hostId: hostUser._id,
        bookings: [],
      },
      {
        title: "Monday Mezze",
        description:
          "Ease into the week with a mellow Monday evening centred around shared plates and stories.",
        address: "3 Olive Lane, Hummus Hill, VIC 3051",
        date: new Date("2025-06-29T18:30:00"),
        image: "mezzemonday.png",
        seatsTotal: 10,
        seatsFilled: 0,
        hostId: hostUser._id,
        bookings: [],
      },
      {
        title: "Social Saturday",
        description:
          "Kick off your weekend with energy and ease at Social Saturday — a casual gathering built for making friends.",
        address: "22 Vibe Street, Goodtimes Grove, VIC 3051",
        date: new Date("2025-07-06T19:00:00"),
        image: "socialsaturday.png",
        seatsTotal: 5,
        seatsFilled: 0,
        hostId: hostUser._id,
        bookings: [],
      },
    ]);
    console.log("📦 Demo events inserted");

    // Seed demo bookings
    const demoBookings = await Booking.insertMany([
      {
        guestName: "Demo Guest",
        contact: "guest@chinwag.com",
        notes: "",
        avatar: "default.png",
        eventId: demoEvents[0]._id,
        userId: guestUser._id,
      },
    ]);
    console.log("📋 Demo booking inserted");

    // Update event with booking
    await Event.findByIdAndUpdate(demoEvents[0]._id, {
      $push: { bookings: demoBookings[0]._id },
      $inc: { seatsFilled: 1 },
    });

    // Log results
    console.log("🌱 Seed complete!");
    console.log("👤 Host: host@chinwag.com / Host123!");
    console.log("👤 Guest: guest@chinwag.com / Guest123!");
    demoEvents.forEach((event) => {
      console.log(`🆔 ${event.title}: ${event._id}`);
    });
  } catch (err) {
    console.error("❌ Seed failed", err);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 DB connection closed");
  }
}

seed();
