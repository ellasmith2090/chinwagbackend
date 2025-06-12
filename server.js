// ==============================
// Chinwag Backend Entry Point
// ==============================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");

const app = express();
const port = process.env.PORT || 3000;

// ==============================
// Environment Variable Validation
// ==============================
if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI environment variable is not set");
}

// ==============================
// MongoDB Connection
// ==============================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
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
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Log HTTP requests
app.use(morgan("dev"));

// Parse incoming JSON and form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==============================
// Static Files (Images & Public)
// ==============================
const imageFilter = (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  if (![".png", ".jpg", ".jpeg", ".gif"].includes(ext)) {
    return res.status(403).json({ error: "Invalid file type" });
  }
  next();
};

// Serve static files with fallback
function setupStaticRoutes(app) {
  // Serve user-uploaded files
  app.use(
    "/uploads",
    imageFilter,
    express.static(path.join(__dirname, "uploads"), {
      fallthrough: true, // Allow fallback
    })
  );
  app.use("/uploads", (req, res) => {
    res
      .status(404)
      .sendFile(path.join(__dirname, "public", "static", "default.png"));
  });

  // Serve static assets
  app.use(
    "/public",
    express.static(path.join(__dirname, "public"), {
      fallthrough: true,
    })
  );
  app.use("/public", (req, res) => {
    res
      .status(404)
      .sendFile(path.join(__dirname, "public", "static", "default.png"));
  });
}
setupStaticRoutes(app);

// ==============================
// Root Route
// ==============================
app.get("/", (req, res) => {
  res.json({ status: "Chinwag Events API", version: "1.0.0" });
});

// ==============================
// API Route Mounting
// ==============================
const userRouter = require("./routes/user");
const authRouter = require("./routes/auth");
const eventsRouter = require("./routes/events");
const bookingsRouter = require("./routes/bookings");

app.use("/api/user", userRouter);
app.use("/api/auth", authRouter);
app.use("/api/events", eventsRouter);
app.use("/api/bookings", bookingsRouter);

// ==============================
// Global Error Middleware
// ==============================
app.use((err, req, res, next) => {
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS policy violation" });
  }
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
  next();
});

// ==============================
// Start Server
// ==============================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
