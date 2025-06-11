// ==============================
// Chinwag Backend Entry Point
// ==============================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// ==============================
// MongoDB Connection
// ==============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("DB connected"))
  .catch((err) => console.error("DB connection failed", err));

// ==============================
// Middleware Setup
// ==============================

const allowedOrigins = [
  "http://localhost:1234",
  "https://chinwagevents.netlify.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); //
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================
// Static Files (Images & Public)
// ==============================
function setupStaticRoutes(app) {
  app.use(
    "/avatars",
    express.static(path.join(__dirname, "uploads", "avatars"))
  );

  app.use(
    "/uploads/events",
    express.static(path.join(__dirname, "uploads", "events"))
  );

  app.use("/images", express.static(path.join(__dirname, "public", "images")));
  app.use(express.static(path.join(__dirname, "public")));
}
setupStaticRoutes(app);

// ==============================
// Root Route
// ==============================
app.get("/", (req, res) => {
  res.send("This is the homepage");
});

// ==============================
// API Route Mounting
// ==============================
const userRouter = require("./routes/user");
const authRouter = require("./routes/auth");
const eventsRouter = require("./routes/events");
const bookingsRouter = require("./routes/bookings");

app.use("/user", userRouter);
app.use("/auth", authRouter);
app.use("/events", eventsRouter);
app.use("/bookings", bookingsRouter);

// ==============================
// Start Server
// ==============================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
