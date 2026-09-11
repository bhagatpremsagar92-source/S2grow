
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SITE_URL = "https://s2grow.onrender.com";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google Search Console verification
app.get("/googleec2d84ebf54fe011.html", (req, res) => {
  res.type("text/plain").send(
    "google-site-verification: googleec2d84ebf54fe011.html"
  );
});

// Robots.txt
app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
  );
});

// Sitemap.xml
app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${SITE_URL}/</loc>
  </url>

</urlset>`
  );
});

// Serve website files
app.use(express.static(__dirname));

// Homepage
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
