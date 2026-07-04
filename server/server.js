const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { getDatabase } = require("./database");
const { authMiddleware } = require("./middleware/auth");

// Init DB
getDatabase();
try {
  const db = getDatabase();
  const count = db.prepare("SELECT COUNT(*) as cnt FROM products").get();
  if (count.cnt === 0) {
    console.log("🌱 Seeding products...");
    require("./seed");
  }
} catch (e) {
  console.log("⚠️ Seed check skipped:", e.message);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve admin dashboard as static files
app.use("/admin", express.static(path.join(__dirname, "admin")));

// Serve main website static files (HTML, CSS, JS, images) from parent folder
app.use(express.static(path.join(__dirname, "..")));

// API Routes — Public (no auth required)
app.use("/api/auth", require("./routes/auth"));
app.use("/api/contact", require("./routes/contacts"));
app.use("/api/contacts", require("./routes/contacts"));
app.use("/api/products", require("./routes/products"));
app.use("/api/recommend", require("./routes/recommend"));

// API Routes — Protected (auth required)
app.use("/api/stats", authMiddleware, require("./routes/stats"));
app.use("/api/quotations", authMiddleware, require("./routes/quotations"));

// API root — welcome message
app.get("/api", (req, res) => {
  res.json({
    name: "AeroGreen Hub API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      contact: "POST /api/contact",
      contacts: "GET /api/contacts",
      contactDetail: "PATCH /api/contacts/:id",
      products: "GET /api/products",
      productDetail: "GET /api/products/:id",
      compare: "GET /api/products/compare?ids=1,2",
      recommend: "GET /api/recommend?house_type=&area=&budget=",
      stats: "GET /api/stats",
      quotations: "GET/POST /api/quotations",
      quotationById: "GET/PUT/DELETE /api/quotations/:id",
      quotationByRequest: "GET /api/quotations/by-request/:requestId",
      quotationStatus: "PATCH /api/quotations/:id/status",
    },
    contract: "/hop-dong?code=AGH001",
    admin: "/admin",
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve login page
app.get("/login", (req, res) => {
  const loginPath = path.join(__dirname, "admin", "login.html");
  if (fs.existsSync(loginPath)) {
    res.sendFile(loginPath);
  } else {
    res.status(404).json({ error: "Trang đăng nhập không tìm thấy." });
  }
});

// Admin fallback (SPA-like)
app.get("/admin*", (req, res) => {
  const adminPath = path.join(__dirname, "admin", "index.html");
  if (fs.existsSync(adminPath)) {
    res.sendFile(adminPath);
  } else {
    res.status(404).json({ error: "Admin dashboard not found" });
  }
});

// Root — serve main website
app.get("/", (req, res) => {
  const indexPath = path.join(__dirname, "..", "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: "Trang chủ không tìm thấy." });
  }
});

// Public contract page (hợp đồng)
app.get("/hop-dong", (req, res) => {
  const contractPath = path.join(__dirname, "..", "contract.html");
  if (fs.existsSync(contractPath)) {
    res.sendFile(contractPath);
  } else {
    res.status(404).json({ error: "Trang hợp đồng không tìm thấy." });
  }
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔══════════════════════════════════════════╗
║        🌿 AeroGreen Hub Server          ║
║──────────────────────────────────────────║
║  URL:   http://localhost:${PORT}          ║
║  Admin: http://localhost:${PORT}/admin    ║
║  API:   http://localhost:${PORT}/api      ║
╚══════════════════════════════════════════╝
  `);
});
