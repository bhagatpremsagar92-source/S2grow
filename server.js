const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SITE_URL = "https://s2grow.onrender.com";

// ======================================================
// CONFIG
// ======================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "841239";

const PROVIDER_API_URL =
  process.env.PROVIDER_API_URL || "";

const PROVIDER_API_KEY =
  process.env.PROVIDER_API_KEY || "";

const PROVIDER_NAME =
  process.env.PROVIDER_NAME || "Growtak";

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ======================================================
// GOOGLE SEARCH CONSOLE
// ======================================================

app.get("/googleec2d84ebf54fe011.html", (req, res) => {
  res
    .status(200)
    .type("text/plain")
    .send("google-site-verification: googleec2d84ebf54fe011.html");
});

// ======================================================
// ROBOTS.TXT
// ======================================================

app.get("/robots.txt", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .send(
`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`
    );
});

// ======================================================
// SITEMAP.XML
// ======================================================

app.get("/sitemap.xml", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "application/xml; charset=utf-8")
    .send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
  </url>
</urlset>`
    );
});

// ======================================================
// SIMPLE IN-MEMORY DATA
// ======================================================

const orders = [];
let nextOrderId = 1001;

// ======================================================
// API SETTINGS
// ======================================================

function getSettings() {
  return {
    providerName: PROVIDER_NAME,
    apiConfigured: Boolean(
      PROVIDER_API_URL && PROVIDER_API_KEY
    ),
    providerApiUrl: PROVIDER_API_URL
      ? "configured"
      : "",
    message: PROVIDER_API_URL && PROVIDER_API_KEY
      ? "Provider API connected"
      : "Provider API not configured"
  };
}

app.get("/api/settings", (req, res) => {
  try {
    res.json(getSettings());
  } catch (error) {
    console.error("Settings error:", error);
    res.status(500).json({
      error: "Unable to load settings"
    });
  }
});

// Allow frontend/admin to test/save settings without exposing API key
app.post("/api/settings", (req, res) => {
  res.json({
    success: true,
    ...getSettings()
  });
});

app.put("/api/settings", (req, res) => {
  res.json({
    success: true,
    ...getSettings()
  });
});

// ======================================================
// ADMIN LOGIN API
// ======================================================

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: "Invalid admin password"
    });
  }

  res.json({
    success: true,
    message: "Admin login successful"
  });
});

// ======================================================
// PROVIDER API HELPER
// ======================================================

async function providerRequest(params = {}) {
  if (!PROVIDER_API_URL || !PROVIDER_API_KEY) {
    return null;
  }

  try {
    const body = new URLSearchParams();

    body.append("key", PROVIDER_API_KEY);

    for (const [key, value] of Object.entries(params)) {
      body.append(key, String(value));
    }

    const response = await fetch(PROVIDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      throw new Error(
        `Provider HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("Provider API error:", error);
    throw error;
  }
}

// ======================================================
// PROVIDER SERVICES
// ======================================================

app.get("/api/provider-services", async (req, res) => {
  try {
    // If provider API is configured, try loading live services.
    if (PROVIDER_API_URL && PROVIDER_API_KEY) {
      try {
        const result = await providerRequest({
          action: "services"
        });

        if (Array.isArray(result)) {
          return res.json({
            success: true,
            services: result
          });
        }

        if (Array.isArray(result?.services)) {
          return res.json({
            success: true,
            services: result.services
          });
        }
      } catch (error) {
        console.error(
          "Live provider services unavailable:",
          error.message
        );
      }
    }

    // Safe fallback
    res.json({
      success: true,
      provider: PROVIDER_NAME,
      services: []
    });

  } catch (error) {
    console.error("Provider services error:", error);

    res.status(500).json({
      success: false,
      error: "Provider services unavailable",
      services: []
    });
  }
});

// ======================================================
// CREATE ORDER
// ======================================================

app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body || {};

    const service =
      body.service ??
      body.serviceId ??
      body.providerServiceId ??
      "";

    const link =
      body.link ??
      body.url ??
      "";

    const quantity =
      Number(body.quantity ?? body.qty ?? 0);

    const charge =
      Number(body.charge ?? body.price ?? 0);

    if (!service) {
      return res.status(400).json({
        success: false,
        error: "Service is required"
      });
    }

    if (!link) {
      return res.status(400).json({
        success: false,
        error: "Link is required"
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Valid quantity is required"
      });
    }

    const id = String(nextOrderId++);

    const order = {
      id,
      service,
      link,
      quantity,
      charge,
      status: "Pending",
      createdAt: new Date().toISOString(),
      providerOrderId: null
    };

    // Send to provider only if configured.
    if (PROVIDER_API_URL && PROVIDER_API_KEY) {
      try {
        const providerResult = await providerRequest({
          action: "add",
          service:
            body.providerServiceId ||
            body.serviceId ||
            service,
          link,
          quantity
        });

        if (
          providerResult &&
          providerResult.order
        ) {
          order.providerOrderId =
            String(providerResult.order);

          order.status = "Submitted";
        }
      } catch (error) {
        console.error(
          "Provider order submission failed:",
          error.message
        );

        // Keep local order instead of crashing frontend.
        order.status = "Pending Provider";
      }
    }

    orders.push(order);

    res.status(201).json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Create order error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to create order"
    });
  }
});

// ======================================================
// GET ORDERS
// ======================================================

app.get("/api/orders", (req, res) => {
  try {
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Orders error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to load orders",
      orders: []
    });
  }
});

// ======================================================
// APPROVE ORDER
// ======================================================

app.post("/api/orders/:id/approve", (req, res) => {
  try {
    const order = orders.find(
      item => item.id === String(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    order.status = "Approved";
    order.approvedAt = new Date().toISOString();

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Approve order error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to approve order"
    });
  }
});

// ======================================================
// ORDER STATUS
// ======================================================

app.get("/api/orders/:id/status", async (req, res) => {
  try {
    const order = orders.find(
      item => item.id === String(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // If provider order exists, try live status.
    if (
      PROVIDER_API_URL &&
      PROVIDER_API_KEY &&
      order.providerOrderId
    ) {
      try {
        const result = await providerRequest({
          action: "status",
          order: order.providerOrderId
        });

        return res.json({
          success: true,
          orderId: order.id,
          providerOrderId: order.providerOrderId,
          status:
            result?.status ||
            order.status,
          provider: result
        });

      } catch (error) {
        console.error(
          "Provider status error:",
          error.message
        );
      }
    }

    res.json({
      success: true,
      orderId: order.id,
      status: order.status
    });

  } catch (error) {
    console.error("Order status error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to get order status"
    });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "S2 Grow",
    provider: PROVIDER_NAME,
    apiConfigured: Boolean(
      PROVIDER_API_URL && PROVIDER_API_KEY
    ),
    time: new Date().toISOString()
  });
});

// ======================================================
// STATIC WEBSITE
// ======================================================

app.use(express.static(__dirname));

// ======================================================
// HOMEPAGE
// ======================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `S2 Grow running on port ${PORT}`
  );

  console.log(
    `Provider: ${PROVIDER_NAME}`
  );

  console.log(
    `Provider API configured: ${
      PROVIDER_API_URL && PROVIDER_API_KEY
        ? "YES"
        : "NO"
    }`
  );
});const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const SITE_URL = "https://s2grow.onrender.com";

// ======================================================
// CONFIG
// ======================================================

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "841239";

const PROVIDER_API_URL =
  process.env.PROVIDER_API_URL || "";

const PROVIDER_API_KEY =
  process.env.PROVIDER_API_KEY || "";

const PROVIDER_NAME =
  process.env.PROVIDER_NAME || "Growtak";

// ======================================================
// MIDDLEWARE
// ======================================================

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// ======================================================
// GOOGLE SEARCH CONSOLE
// ======================================================

app.get("/googleec2d84ebf54fe011.html", (req, res) => {
  res
    .status(200)
    .type("text/plain")
    .send("google-site-verification: googleec2d84ebf54fe011.html");
});

// ======================================================
// ROBOTS.TXT
// ======================================================

app.get("/robots.txt", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/plain; charset=utf-8")
    .send(
`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml`
    );
});

// ======================================================
// SITEMAP.XML
// ======================================================

app.get("/sitemap.xml", (req, res) => {
  res
    .status(200)
    .set("Content-Type", "application/xml; charset=utf-8")
    .send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
  </url>
</urlset>`
    );
});

// ======================================================
// SIMPLE IN-MEMORY DATA
// ======================================================

const orders = [];
let nextOrderId = 1001;

// ======================================================
// API SETTINGS
// ======================================================

function getSettings() {
  return {
    providerName: PROVIDER_NAME,
    apiConfigured: Boolean(
      PROVIDER_API_URL && PROVIDER_API_KEY
    ),
    providerApiUrl: PROVIDER_API_URL
      ? "configured"
      : "",
    message: PROVIDER_API_URL && PROVIDER_API_KEY
      ? "Provider API connected"
      : "Provider API not configured"
  };
}

app.get("/api/settings", (req, res) => {
  try {
    res.json(getSettings());
  } catch (error) {
    console.error("Settings error:", error);
    res.status(500).json({
      error: "Unable to load settings"
    });
  }
});

// Allow frontend/admin to test/save settings without exposing API key
app.post("/api/settings", (req, res) => {
  res.json({
    success: true,
    ...getSettings()
  });
});

app.put("/api/settings", (req, res) => {
  res.json({
    success: true,
    ...getSettings()
  });
});

// ======================================================
// ADMIN LOGIN API
// ======================================================

app.post("/api/admin/login", (req, res) => {
  const password = String(req.body?.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
      success: false,
      error: "Invalid admin password"
    });
  }

  res.json({
    success: true,
    message: "Admin login successful"
  });
});

// ======================================================
// PROVIDER API HELPER
// ======================================================

async function providerRequest(params = {}) {
  if (!PROVIDER_API_URL || !PROVIDER_API_KEY) {
    return null;
  }

  try {
    const body = new URLSearchParams();

    body.append("key", PROVIDER_API_KEY);

    for (const [key, value] of Object.entries(params)) {
      body.append(key, String(value));
    }

    const response = await fetch(PROVIDER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = {
        raw: text
      };
    }

    if (!response.ok) {
      throw new Error(
        `Provider HTTP ${response.status}`
      );
    }

    return data;
  } catch (error) {
    console.error("Provider API error:", error);
    throw error;
  }
}

// ======================================================
// PROVIDER SERVICES
// ======================================================

app.get("/api/provider-services", async (req, res) => {
  try {
    // If provider API is configured, try loading live services.
    if (PROVIDER_API_URL && PROVIDER_API_KEY) {
      try {
        const result = await providerRequest({
          action: "services"
        });

        if (Array.isArray(result)) {
          return res.json({
            success: true,
            services: result
          });
        }

        if (Array.isArray(result?.services)) {
          return res.json({
            success: true,
            services: result.services
          });
        }
      } catch (error) {
        console.error(
          "Live provider services unavailable:",
          error.message
        );
      }
    }

    // Safe fallback
    res.json({
      success: true,
      provider: PROVIDER_NAME,
      services: []
    });

  } catch (error) {
    console.error("Provider services error:", error);

    res.status(500).json({
      success: false,
      error: "Provider services unavailable",
      services: []
    });
  }
});

// ======================================================
// CREATE ORDER
// ======================================================

app.post("/api/orders", async (req, res) => {
  try {
    const body = req.body || {};

    const service =
      body.service ??
      body.serviceId ??
      body.providerServiceId ??
      "";

    const link =
      body.link ??
      body.url ??
      "";

    const quantity =
      Number(body.quantity ?? body.qty ?? 0);

    const charge =
      Number(body.charge ?? body.price ?? 0);

    if (!service) {
      return res.status(400).json({
        success: false,
        error: "Service is required"
      });
    }

    if (!link) {
      return res.status(400).json({
        success: false,
        error: "Link is required"
      });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({
        success: false,
        error: "Valid quantity is required"
      });
    }

    const id = String(nextOrderId++);

    const order = {
      id,
      service,
      link,
      quantity,
      charge,
      status: "Pending",
      createdAt: new Date().toISOString(),
      providerOrderId: null
    };

    // Send to provider only if configured.
    if (PROVIDER_API_URL && PROVIDER_API_KEY) {
      try {
        const providerResult = await providerRequest({
          action: "add",
          service:
            body.providerServiceId ||
            body.serviceId ||
            service,
          link,
          quantity
        });

        if (
          providerResult &&
          providerResult.order
        ) {
          order.providerOrderId =
            String(providerResult.order);

          order.status = "Submitted";
        }
      } catch (error) {
        console.error(
          "Provider order submission failed:",
          error.message
        );

        // Keep local order instead of crashing frontend.
        order.status = "Pending Provider";
      }
    }

    orders.push(order);

    res.status(201).json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Create order error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to create order"
    });
  }
});

// ======================================================
// GET ORDERS
// ======================================================

app.get("/api/orders", (req, res) => {
  try {
    res.json({
      success: true,
      orders
    });
  } catch (error) {
    console.error("Orders error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to load orders",
      orders: []
    });
  }
});

// ======================================================
// APPROVE ORDER
// ======================================================

app.post("/api/orders/:id/approve", (req, res) => {
  try {
    const order = orders.find(
      item => item.id === String(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    order.status = "Approved";
    order.approvedAt = new Date().toISOString();

    res.json({
      success: true,
      order
    });

  } catch (error) {
    console.error("Approve order error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to approve order"
    });
  }
});

// ======================================================
// ORDER STATUS
// ======================================================

app.get("/api/orders/:id/status", async (req, res) => {
  try {
    const order = orders.find(
      item => item.id === String(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found"
      });
    }

    // If provider order exists, try live status.
    if (
      PROVIDER_API_URL &&
      PROVIDER_API_KEY &&
      order.providerOrderId
    ) {
      try {
        const result = await providerRequest({
          action: "status",
          order: order.providerOrderId
        });

        return res.json({
          success: true,
          orderId: order.id,
          providerOrderId: order.providerOrderId,
          status:
            result?.status ||
            order.status,
          provider: result
        });

      } catch (error) {
        console.error(
          "Provider status error:",
          error.message
        );
      }
    }

    res.json({
      success: true,
      orderId: order.id,
      status: order.status
    });

  } catch (error) {
    console.error("Order status error:", error);

    res.status(500).json({
      success: false,
      error: "Unable to get order status"
    });
  }
});

// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "S2 Grow",
    provider: PROVIDER_NAME,
    apiConfigured: Boolean(
      PROVIDER_API_URL && PROVIDER_API_KEY
    ),
    time: new Date().toISOString()
  });
});

// ======================================================
// STATIC WEBSITE
// ======================================================

app.use(express.static(__dirname));

// ======================================================
// HOMEPAGE
// ======================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

// ======================================================
// ERROR HANDLER
// ======================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found",
    path: req.path
  });
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, "0.0.0.0", () => {
  console.log(
    `S2 Grow running on port ${PORT}`
  );

  console.log(
    `Provider: ${PROVIDER_NAME}`
  );

  console.log(
    `Provider API configured: ${
      PROVIDER_API_URL && PROVIDER_API_KEY
        ? "YES"
        : "NO"
    }`
  );
});
