// seedDemoEvents.js

require("dotenv").config();
const mongoose = require("mongoose");
const Event = require("./models/Event");

const hostId = "684841272faa23bc48993b25"; // Your real host user

const demoEvents = [
  {
    title: "Mezze Monday",
    description: "Enjoy a Mediterranean platter and a good chat.",
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
    address: "123 Olive Lane, Byron Bay",
    image: "mezzemonday.png", // served from /images/
    hostId,
    seatsTotal: 10,
    seatsFilled: 3,
    bookings: [],
  },
  {
    title: "Social Saturday",
    description: "A casual catch-up for friendly locals.",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    address: "56 Beach Parade, Noosa",
    image: "socialsaturday.png",
    hostId,
    seatsTotal: 8,
    seatsFilled: 2,
    bookings: [],
  },
  {
    title: "Coffee & Chit Chat",
    description: "Great coffee, better conversation!",
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week later
    address: "88 Bean Street, Eumundi",
    image: "coffeechitchat.png",
    hostId,
    seatsTotal: 12,
    seatsFilled: 6,
    bookings: [],
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    await Event.deleteMany();
    console.log("🧹 Old events cleared");

    await Event.insertMany(demoEvents);
    console.log("📦 Demo events inserted");

    await mongoose.disconnect();
    console.log("🔌 DB connection closed");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  }
}

seed();
