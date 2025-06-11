const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Event = require("./models/Event");

// Connect to DB
async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    // Clear old events
    await Event.deleteMany({});
    console.log("🧹 Old events cleared");

    // Seed demo events with provided hostId
    const demoEvents = await Event.insertMany([
      {
        title: "Coffee Chit Chat",
        description:
          "A friendly nook for casual conversations and warm sips, Coffee Chit Chat is your Sunday slow-down with a social twist. Whether you're new in town or just keen to connect, this easygoing gathering offers a welcoming table, good coffee, and light-hearted prompts to spark meaningful chatter — no pressure, just presence.",
        address: "12 Brew Street, Chatfield, VIC 3051",
        date: new Date("2025-06-28T10:00:00"),
        image: "coffeechitchat.png",
        seatsTotal: 15,
        seatsFilled: 0,
        hostId: "684841272faa23bc48993b25",
        bookings: [],
      },
      {
        title: "Monday Mezze",
        description:
          "Ease into the week with a mellow Monday evening centred around shared plates and stories. This intimate mezze night invites guests to gather around a long table, enjoying warm dishes, cool drinks, and reflective conversation. Whether you're decompressing from the day or leaning into new intentions, this space is made for meaningful connection — one bite at a time.",
        address: "3 Olive Lane, Hummus Hill, VIC 3051",
        date: new Date("2025-06-29T18:30:00"),
        image: "mezzemonday.png",
        seatsTotal: 10,
        seatsFilled: 0,
        hostId: "684841272faa23bc48993b25",
        bookings: [],
      },
      {
        title: "Social Saturday",
        description:
          "Kick off your weekend with energy and ease at Social Saturday — a casual gathering built for making friends, not small talk. With upbeat tunes, communal snacks, and a few playful conversation starters, this event creates a low-pressure space for real connection. Come as you are and stay as long as you like — it’s a Saturday hangout without the awkward edges.",
        address: "22 Vibe Street, Goodtimes Grove, VIC 3051",
        date: new Date("2025-07-06T19:00:00"),
        image: "socialsaturday.png",
        seatsTotal: 5,
        seatsFilled: 0,
        hostId: "684841272faa23bc48993b25",
        bookings: [],
      },
    ]);

    console.log("📦 Demo events inserted");

    // Output event IDs for use in booking seeding
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
