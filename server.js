const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// S2GROW CONFIG
// ===============================

const SITE_URL = "https://s2grow.onrender.com";

// Render Environment Variable में ADMIN_PASSWORD रखें
// नहीं रखने पर यह default password रहेगा
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "@841239";

// ===============================
// DATA FILES
// ===============================

const DATA_DIR = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, "[]");
}

if (!fs.existsSync(SETTINGS_FILE)) {
  fs.writeFileSync(
    SETTINGS_FILE,
    JSON.stringify(
      {
        siteName: "S2GROW",
        tagline: "Social Media Marketing Panel",
        whatsapp: ""
      },
      null,
      2
    )
  );
}

// ===============================
// HELPERS
// ===============================

function readJSON(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    return fallback;
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(data, null, 2)
  );
}

function adminOK(req) {
  return (
    String(req.headers["x-admin-password"] || "") ===
    ADMIN_PASSWORD
  );
}

// ===============================
// MIDDLEWARE
// ===============================

app.use(express.json({ limit: "5mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "5mb"
  })
);

// ===============================
// GOOGLE SEARCH CONSOLE
// ===============================

app.get(
  "/googleec2d84ebf54fe011.html",
  (req, res) => {
    res
      .type("text/plain")
      .send(
        "google-site-verification: googleec2d84ebf54fe011.html"
      );
  }
);

// ===============================
// ROBOTS.TXT
// ===============================

app.get("/robots.txt", (req, res) => {
  res
    .type("text/plain")
    .send(
`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
    );
});

// ===============================
// SITEMAP.XML
// ===============================

app.get("/sitemap.xml", (req, res) => {
  res
    .type("application/xml")
    .send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${SITE_URL}/</loc>
  </url>

</urlset>`
    );
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "online",
    service: "S2GROW"
  });
});

// ==================================================
// PUBLIC SETTINGS
// ==================================================

app.get("/api/settings", (req, res) => {
  const settings = readJSON(
    SETTINGS_FILE,
    {
      siteName: "S2GROW",
      tagline: "Social Media Marketing Panel",
      whatsapp: ""
    }
  );

  res.json(settings);
});

// ==================================================
// USER ORDER CREATE
// ==================================================

app.post("/api/orders", (req, res) => {
  try {
    const body = req.body || {};

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const service = String(body.service || "").trim();
    const link = String(body.link || "").trim();
    const quantity = Number(body.quantity || 0);
    const charge = Number(body.charge || 0);

    if (!name) {
      return res.status(400).json({
        ok: false,
        error: "Name required."
      });
    }

    if (!email) {
      return res.status(400).json({
        ok: false,
        error: "Gmail required."
      });
    }

    if (!service) {
      return res.status(400).json({
        ok: false,
        error: "Service required."
      });
    }

    if (!link) {
      return res.status(400).json({
        ok: false,
        error: "Link required."
      });
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Valid quantity required."
      });
    }

    const orders = readJSON(
      ORDERS_FILE,
      []
    );

    const order = {
      id:
        "ORD-" +
        Date.now()
          .toString(36)
          .toUpperCase(),

      createdAt:
        new Date().toISOString(),

      name,
      email,
      service,
      link,
      quantity,
      charge: Number.isFinite(charge)
        ? charge
        : 0,

      note: String(
        body.note || ""
      ).trim(),

      status: "Pending"
    };

    orders.unshift(order);

    writeJSON(
      ORDERS_FILE,
      orders
    );

    console.log(
      "New Order:",
      order.id,
      order.email
    );

    res.json({
      ok: true,
      message: "Order submitted successfully.",
      order
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Server error."
    });
  }
});

// ==================================================
// ADMIN LOGIN
// ==================================================

app.post(
  "/api/admin/login",
  (req, res) => {
    const password = String(
      req.body?.password || ""
    );

    if (
      password !== ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        ok: false,
        error: "Wrong admin password."
      });
    }

    res.json({
      ok: true,
      message: "Admin login successful."
    });
  }
);

// ==================================================
// ADMIN - GET ALL ORDERS
// ==================================================

app.get(
  "/api/admin/orders",
  (req, res) => {
    if (!adminOK(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    const orders = readJSON(
      ORDERS_FILE,
      []
    );

    res.json({
      ok: true,
      orders
    });
  }
);

// ==================================================
// ADMIN - CHANGE ORDER STATUS
// ==================================================

app.patch(
  "/api/admin/orders/:id",
  (req, res) => {
    if (!adminOK(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    const allowedStatuses = [
      "Pending",
      "Processing",
      "Completed",
      "Cancelled"
    ];

    const status =
      req.body?.status;

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      return res.status(400).json({
        ok: false,
        error: "Invalid order status."
      });
    }

    const orders = readJSON(
      ORDERS_FILE,
      []
    );

    const order =
      orders.find(
        (item) =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        ok: false,
        error: "Order not found."
      });
    }

    order.status = status;

    order.updatedAt =
      new Date().toISOString();

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      ok: true,
      message:
        "Order status updated.",
      order
    });
  }
);

// ==================================================
// ADMIN - UPDATE SETTINGS
// ==================================================

app.patch(
  "/api/admin/settings",
  (req, res) => {
    if (!adminOK(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    const oldSettings =
      readJSON(
        SETTINGS_FILE,
        {}
      );

    const settings = {
      siteName:
        String(
          req.body?.siteName ??
          oldSettings.siteName ??
          "S2GROW"
        ).trim(),

      tagline:
        String(
          req.body?.tagline ??
          oldSettings.tagline ??
          "Social Media Marketing Panel"
        ).trim(),

      whatsapp:
        String(
          req.body?.whatsapp ??
          oldSettings.whatsapp ??
          ""
        ).trim()
    };

    writeJSON(
      SETTINGS_FILE,
      settings
    );

    res.json({
      ok: true,
      message:
        "Settings saved.",
      settings
    });
  }
);

// ==================================================
// ADMIN - DELETE ORDER
// ==================================================

app.delete(
  "/api/admin/orders/:id",
  (req, res) => {
    if (!adminOK(req)) {
      return res.status(401).json({
        ok: false,
        error: "Unauthorized."
      });
    }

    const orders = readJSON(
      ORDERS_FILE,
      []
    );

    const oldLength =
      orders.length;

    const newOrders =
      orders.filter(
        (order) =>
          order.id !==
          req.params.id
      );

    if (
      newOrders.length ===
      oldLength
    ) {
      return res.status(404).json({
        ok: false,
        error: "Order not found."
      });
    }

    writeJSON(
      ORDERS_FILE,
      newOrders
    );

    res.json({
      ok: true,
      message:
        "Order deleted."
    });
  }
);

// ==================================================
// STATIC WEBSITE
// ==================================================

app.use(
  express.static(
    __dirname,
    {
      index: false
    }
  )
);

// ==================================================
// HOME PAGE
// ==================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );
});

// ==================================================
// 404
// ==================================================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Page not found."
  });
});

// ==================================================
// START SERVER
// ==================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `S2GROW server running on port ${PORT}`
    );
  }
);
