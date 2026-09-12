const express = require("express");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// SETTINGS
// =====================================================

const SITE_URL = "https://s2grow.onrender.com";

// Render Environment में ADMIN_PASSWORD डाल सकते हैं.
// अगर नहीं डालेंगे तो यह default password चलेगा:
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "841239";

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// IN-MEMORY DATA
// =====================================================

let settings = {
  name: "Sagar X Digital",
  tag: "Social Media Marketing Panel",
  wa: "9319475583",
  upi: "",
  qr: ""
};

let services = [
  {
    id: "igv",
    cat: "Instagram",
    icon: "📸",
    name: "Instagram Views",
    price: 0.09,
    min: 100,
    max: 1000000,
    desc: "Instagram video/reel views service."
  },
  {
    id: "igl",
    cat: "Instagram",
    icon: "❤️",
    name: "Instagram Likes",
    price: 1.50,
    min: 10,
    max: 100000,
    desc: "Instagram likes service."
  },
  {
    id: "igf",
    cat: "Instagram",
    icon: "👥",
    name: "Instagram Followers",
    price: 5,
    min: 10,
    max: 100000,
    desc: "Instagram followers service."
  },
  {
    id: "fbv",
    cat: "Facebook",
    icon: "🔵",
    name: "Facebook Views",
    price: 0.10,
    min: 100,
    max: 1000000,
    desc: "Facebook video views."
  },
  {
    id: "fbl",
    cat: "Facebook",
    icon: "👍",
    name: "Facebook Likes",
    price: 3,
    min: 10,
    max: 100000,
    desc: "Facebook likes."
  },
  {
    id: "ytv",
    cat: "YouTube",
    icon: "▶️",
    name: "YouTube Views",
    price: 8,
    min: 100,
    max: 1000000,
    desc: "YouTube views."
  },
  {
    id: "ytl",
    cat: "YouTube",
    icon: "👍",
    name: "YouTube Likes",
    price: 10,
    min: 10,
    max: 100000,
    desc: "YouTube likes."
  },
  {
    id: "ytf",
    cat: "YouTube",
    icon: "🔔",
    name: "YouTube Subscribers",
    price: 25,
    min: 10,
    max: 100000,
    desc: "YouTube subscribers."
  },
  {
    id: "ttv",
    cat: "TikTok",
    icon: "🎵",
    name: "TikTok Views",
    price: 0.70,
    min: 100,
    max: 1000000,
    desc: "TikTok views."
  },
  {
    id: "ttf",
    cat: "TikTok",
    icon: "👥",
    name: "TikTok Followers",
    price: 8,
    min: 10,
    max: 100000,
    desc: "TikTok followers."
  },
  {
    id: "tel",
    cat: "Telegram",
    icon: "✈️",
    name: "Telegram Members",
    price: 12,
    min: 10,
    max: 100000,
    desc: "Telegram members."
  }
];

let orders = [];

// =====================================================
// ADMIN AUTH
// =====================================================

const adminTokens = new Set();

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getAdminToken(req) {
  const cookies = req.headers.cookie || "";

  const match = cookies
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("s2admin="));

  if (!match) return null;

  return match.split("=")[1];
}

function isAdmin(req) {
  const token = getAdminToken(req);
  return token && adminTokens.has(token);
}

// =====================================================
// GOOGLE SEARCH CONSOLE
// =====================================================

app.get("/googleec2d84ebf54fe011.html", (req, res) => {
  res.type("text/plain").send(
    "google-site-verification: googleec2d84ebf54fe011.html"
  );
});

// =====================================================
// ROBOTS.TXT
// =====================================================

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(
`User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
  );
});

// =====================================================
// SITEMAP
// =====================================================

app.get("/sitemap.xml", (req, res) => {
  res.type("application/xml").send(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
  </url>
  <url>
    <loc>${SITE_URL}/admin</loc>
  </url>
</urlset>`
  );
});

// =====================================================
// PUBLIC SETTINGS
// =====================================================

app.get("/api/settings", (req, res) => {
  res.json({
    ok: true,
    name: settings.name,
    tag: settings.tag,
    wa: settings.wa,
    upi: settings.upi,
    qr: settings.qr
  });
});

// =====================================================
// PUBLIC SERVICES
// =====================================================

app.get("/api/services", (req, res) => {
  res.json({
    ok: true,
    services
  });
});

// Old frontend compatibility
app.get("/api/provider-services", (req, res) => {
  res.json({
    ok: true,
    source: "local",
    services
  });
});

// =====================================================
// CREATE ORDER
// =====================================================

app.post("/api/orders", (req, res) => {
  try {
    const {
      service,
      serviceId,
      quantity,
      link,
      charge,
      screenshot,
      customer
    } = req.body;

    if (!service) {
      return res.status(400).json({
        ok: false,
        error: "Service required"
      });
    }

    if (!link) {
      return res.status(400).json({
        ok: false,
        error: "Link / Username required"
      });
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty <= 0) {
      return res.status(400).json({
        ok: false,
        error: "Valid quantity required"
      });
    }

    const order = {
      id: "S2-" + Date.now(),

      service: service,
      serviceId: serviceId || "",

      quantity: qty,
      link: link,

      charge: Number(charge || 0),

      screenshot: screenshot || "",

      customer: customer || "",

      status: "Pending",

      note: "",

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    orders.unshift(order);

    console.log("NEW ORDER:", order.id);

    res.json({
      ok: true,
      message: "Order received",
      order
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
});

// =====================================================
// PUBLIC ORDER STATUS
// =====================================================

app.get("/api/orders/:id", (req, res) => {
  const order = orders.find(
    x => x.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: "Order not found"
    });
  }

  res.json({
    ok: true,
    order: {
      id: order.id,
      service: order.service,
      quantity: order.quantity,
      charge: order.charge,
      status: order.status,
      createdAt: order.createdAt,
      note: order.note
    }
  });
});

// =====================================================
// ADMIN LOGIN PAGE
// =====================================================

app.get("/admin", (req, res) => {

  if (isAdmin(req)) {
    return sendAdminPanel(res);
  }

  res.send(`
<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sagar X Digital - Admin Login</title>

<style>
*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f3efff;
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
}

.box{
  width:92%;
  max-width:420px;
  background:white;
  padding:28px;
  border-radius:20px;
  box-shadow:0 10px 40px rgba(0,0,0,.15);
}

h2{
  margin-top:0;
}

input{
  width:100%;
  padding:14px;
  border:1px solid #ddd;
  border-radius:10px;
  margin:10px 0;
  font-size:16px;
}

button{
  width:100%;
  padding:14px;
  border:0;
  border-radius:10px;
  background:#7657d9;
  color:white;
  font-size:16px;
  cursor:pointer;
}

.error{
  color:#d00;
  margin-top:10px;
}
</style>
</head>

<body>

<div class="box">

<h2>🔐 Admin Login</h2>

<p>Sagar X Digital Admin Panel</p>

<form method="POST" action="/admin/login">

<input
  type="password"
  name="password"
  placeholder="Admin Password"
  required
>

<button type="submit">
Login
</button>

</form>

</div>

</body>
</html>
`);
});

// =====================================================
// ADMIN LOGIN
// =====================================================

app.post("/admin/login", (req, res) => {

  const password = String(req.body.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).send(`
      <script>
        alert("Wrong Admin Password");
        location.href="/admin";
      </script>
    `);
  }

  const token = createToken();

  adminTokens.add(token);

  res.setHeader(
    "Set-Cookie",
    `s2admin=${token}; HttpOnly; Path=/; SameSite=Lax`
  );

  res.redirect("/admin");
});

// =====================================================
// ADMIN LOGOUT
// =====================================================

app.get("/admin/logout", (req, res) => {

  const token = getAdminToken(req);

  if (token) {
    adminTokens.delete(token);
  }

  res.setHeader(
    "Set-Cookie",
    "s2admin=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
  );

  res.redirect("/admin");
});

// =====================================================
// ADMIN ORDERS API
// =====================================================

app.get("/api/admin/orders", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  res.json({
    ok: true,
    orders
  });
});

// =====================================================
// ADMIN UPDATE ORDER
// =====================================================

app.post("/api/admin/orders/:id", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  const order = orders.find(
    x => x.id === req.params.id
  );

  if (!order) {
    return res.status(404).json({
      ok: false,
      error: "Order not found"
    });
  }

  if (req.body.status !== undefined) {
    order.status = String(req.body.status);
  }

  if (req.body.note !== undefined) {
    order.note = String(req.body.note);
  }

  order.updatedAt = new Date().toISOString();

  res.json({
    ok: true,
    order
  });
});

// =====================================================
// ADMIN DELETE ORDER
// =====================================================

app.delete("/api/admin/orders/:id", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  const index = orders.findIndex(
    x => x.id === req.params.id
  );

  if (index === -1) {
    return res.status(404).json({
      ok: false,
      error: "Order not found"
    });
  }

  orders.splice(index, 1);

  res.json({
    ok: true,
    message: "Order deleted"
  });
});

// =====================================================
// ADMIN SETTINGS
// =====================================================

app.post("/api/admin/settings", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  if (req.body.name !== undefined) {
    settings.name = String(req.body.name);
  }

  if (req.body.tag !== undefined) {
    settings.tag = String(req.body.tag);
  }

  if (req.body.wa !== undefined) {
    settings.wa = String(req.body.wa);
  }

  if (req.body.upi !== undefined) {
    settings.upi = String(req.body.upi);
  }

  if (req.body.qr !== undefined) {
    settings.qr = String(req.body.qr);
  }

  res.json({
    ok: true,
    settings
  });
});

// =====================================================
// ADMIN SERVICE MANAGEMENT
// =====================================================

app.get("/api/admin/services", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  res.json({
    ok: true,
    services
  });
});

app.post("/api/admin/services", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  const data = req.body;

  if (!data.name) {
    return res.status(400).json({
      ok: false,
      error: "Service name required"
    });
  }

  const service = {
    id: data.id || "service-" + Date.now(),
    cat: data.cat || "Other",
    icon: data.icon || "📦",
    name: data.name,
    price: Number(data.price || 0),
    min: Number(data.min || 1),
    max: Number(data.max || 1000000),
    desc: data.desc || ""
  };

  const existing = services.findIndex(
    x => x.id === service.id
  );

  if (existing >= 0) {
    services[existing] = service;
  } else {
    services.push(service);
  }

  res.json({
    ok: true,
    service
  });
});

// =====================================================
// DELETE SERVICE
// =====================================================

app.delete("/api/admin/services/:id", (req, res) => {

  if (!isAdmin(req)) {
    return res.status(401).json({
      ok: false,
      error: "Admin login required"
    });
  }

  const oldLength = services.length;

  services = services.filter(
    x => x.id !== req.params.id
  );

  if (services.length === oldLength) {
    return res.status(404).json({
      ok: false,
      error: "Service not found"
    });
  }

  res.json({
    ok: true,
    message: "Service deleted"
  });
});

// =====================================================
// ADMIN DASHBOARD HTML
// =====================================================

function sendAdminPanel(res) {

  res.send(`
<!DOCTYPE html>
<html lang="hi">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>Sagar X Digital - Admin Panel</title>

<style>

*{
  box-sizing:border-box;
}

body{
  margin:0;
  font-family:Arial,sans-serif;
  background:#f4f1ff;
  color:#222;
}

header{
  background:linear-gradient(135deg,#6d45d8,#8b5cf6);
  color:white;
  padding:18px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

header h2{
  margin:0;
}

.logout{
  background:white;
  color:#6d45d8;
  padding:9px 14px;
  border-radius:9px;
  text-decoration:none;
}

.container{
  max-width:1100px;
  margin:auto;
  padding:18px;
}

.stats{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:12px;
}

.stat{
  background:white;
  padding:18px;
  border-radius:14px;
  box-shadow:0 3px 12px rgba(0,0,0,.08);
}

.stat b{
  font-size:25px;
}

.card{
  background:white;
  margin-top:18px;
  padding:18px;
  border-radius:16px;
  box-shadow:0 3px 12px rgba(0,0,0,.08);
}

.order{
  border:1px solid #ddd;
  border-radius:12px;
  padding:15px;
  margin-top:12px;
}

.status{
  display:inline-block;
  padding:5px 9px;
  border-radius:8px;
  background:#eee;
  margin:5px 0;
}

button,
select,
input{
  padding:10px;
  border-radius:8px;
  border:1px solid #ddd;
}

button{
  background:#7657d9;
  color:white;
  border:0;
  cursor:pointer;
}

.delete{
  background:#d33;
}

@media(max-width:700px){

.stats{
  grid-template-columns:1fr;
}

}

</style>

</head>

<body>

<header>

<h2>⚙️ Sagar X Digital</h2>

<a class="logout" href="/admin/logout">
Logout
</a>

</header>

<div class="container">

<div class="stats">

<div class="stat">
Total Orders
<br>
<b id="total">0</b>
</div>

<div class="stat">
Pending
<br>
<b id="pending">0</b>
</div>

<div class="stat">
Completed
<br>
<b id="completed">0</b>
</div>

</div>

<div class="card">

<h2>📦 All Orders</h2>

<div id="orders">
Loading...
</div>

</div>

<div class="card">

<h2>⚙️ Website Settings</h2>

<input id="name"
placeholder="Site Name">

<br><br>

<input id="tag"
placeholder="Tagline">

<br><br>

<input id="wa"
placeholder="WhatsApp">

<br><br>

<input id="upi"
placeholder="UPI ID">

<br><br>

<button onclick="saveSettings()">
Save Settings
</button>

</div>

</div>

<script>

async function load(){

  const r = await fetch("/api/admin/orders");
  const data = await r.json();

  if(!data.ok){
    location.href="/admin";
    return;
  }

  const list = data.orders || [];

  document.getElementById("total").textContent =
    list.length;

  document.getElementById("pending").textContent =
    list.filter(x => x.status === "Pending").length;

  document.getElementById("completed").textContent =
    list.filter(x => x.status === "Completed").length;

  const box =
    document.getElementById("orders");

  if(!list.length){
    box.innerHTML =
      "<p>Abhi koi order nahi hai.</p>";
    return;
  }

  box.innerHTML = list.map(o => \`

    <div class="order">

      <b>Order ID:</b> \${o.id}

      <br><br>

      <b>Service:</b>
      \${escapeHtml(o.service)}

      <br>

      <b>Quantity:</b>
      \${o.quantity}

      <br>

      <b>Link:</b>
      \${escapeHtml(o.link)}

      <br>

      <b>Charge:</b>
      ₹\${Number(o.charge || 0).toFixed(2)}

      <br>

      <b>Time:</b>
      \${new Date(o.createdAt).toLocaleString()}

      <br><br>

      <select
        id="status-\${o.id}"
      >

        <option \${o.status==="Pending"?"selected":""}>
          Pending
        </option>

        <option \${o.status==="Processing"?"selected":""}>
          Processing
        </option>

        <option \${o.status==="Completed"?"selected":""}>
          Completed
        </option>

        <option \${o.status==="Cancelled"?"selected":""}>
          Cancelled
        </option>

      </select>

      <button
        onclick="updateOrder('\${o.id}')"
      >
        Update
      </button>

      <button
        class="delete"
        onclick="deleteOrder('\${o.id}')"
      >
        Delete
      </button>

    </div>

  \`).join("");

}

async function updateOrder(id){

  const status =
    document.getElementById("status-"+id).value;

  await fetch("/api/admin/orders/"+id,{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({
      status:status
    })

  });

  load();
}

async function deleteOrder(id){

  if(!confirm("Order delete karein?")){
    return;
  }

  await fetch("/api/admin/orders/"+id,{
    method:"DELETE"
  });

  load();
}

async function saveSettings(){

  await fetch("/api/admin/settings",{

    method:"POST",

    headers:{
      "Content-Type":"application/json"
    },

    body:JSON.stringify({

      name:
        document.getElementById("name").value,

      tag:
        document.getElementById("tag").value,

      wa:
        document.getElementById("wa").value,

      upi:
        document.getElementById("upi").value

    })

  });

  alert("Settings saved");

}

function escapeHtml(text){

  return String(text || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#039;");

}

load();

setInterval(load,10000);

</script>

</body>

</html>
`);
}

// =====================================================
// WEBSITE FILES
// =====================================================

app.use(express.static(__dirname));

// =====================================================
// HOME PAGE
// =====================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});

// =====================================================
// HEALTH
// =====================================================

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "running",
    service: "Sagar X Digital",
 .
