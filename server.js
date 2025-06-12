// ==============================
// Chinwag Backend Entry Point
// ==============================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const connectDB = require("./config/database");
const errorHandler = require("./middleware/errorHandler");
const authMiddleware = require("./middleware/authMiddleware");
const fs = require("fs");

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
connectDB();

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

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api", authMiddleware);

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

const setupStaticRoutes = (app) => {
  // Serve uploaded images with filter and fallback
  app.use(
    "/uploads",
    imageFilter,
    express.static(path.join(__dirname, "uploads"), {
      setHeaders: (res) => {
        res.set("Cache-Control", "public, max-age=31557600");
      },
    })
  );
  app.use("/uploads", (req, res, next) => {
    const defaultImage = path.join(
      __dirname,
      "public",
      "static",
      "defaultevent.png"
    );
    console.log("[Static] Checking default image path:", defaultImage);
    if (fs.existsSync(defaultImage)) {
      res.status(404).sendFile(defaultImage);
    } else {
      console.error("[Static] Default image not found:", defaultImage);
      res.status(500).json({ error: "Default image not available" });
    }
  });

  // Serve static site assets including banner.png with fallback
  const publicPath = path.join(__dirname, "public");
  console.log("[Static] Public path configured:", publicPath);
  if (fs.existsSync(publicPath)) {
    app.use(
      "/public",
      express.static(publicPath, {
        setHeaders: (res) => {
          res.set("Cache-Control", "public, max-age=31557600");
        },
      })
    );
  } else {
    console.error("[Static] Public directory not found:", publicPath);
  }
  app.use("/public", (req, res) => {
    const requestedPath = path.join(publicPath, req.path);
    console.warn("[Static] File not found:", requestedPath);
    res.status(404).json({ error: "File not found" });
  });
};
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
app.use("/api/user", require("./routes/user"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/events", require("./routes/events"));
app.use("/api/bookings", require("./routes/bookings"));

// ==============================
// Global Error Middleware
// ==============================
app.use(errorHandler);

// ==============================
// Start Server
// ==============================
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app; // For Render deployment
