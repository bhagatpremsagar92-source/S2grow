const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve files from the project folder
app.use(express.static(__dirname));

// Google Search Console verification file
app.get("/googleec2d84ebf54fe011.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "googleec2d84ebf54fe011.html")
  );
});

// Main website
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "S2 Grow"
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`S2 Grow running on port ${PORT}`);
});
