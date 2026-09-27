const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const { initDb, DB_URL } = require("./database");
const { authMiddleware } = require("./middleware/auth");

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
app.use("/api/customers", require("./routes/customers"));
app.use("/api/track", require("./routes/track"));
app.use("/api/contact", require("./routes/contacts"));
app.use("/api/contacts", require("./routes/contacts"));
app.use("/api/products", require("./routes/products"));
app.use("/api/recommend", require("./routes/recommend"));

// API Routes — Protected (auth required)
app.use("/api/stats", authMiddleware, require("./routes/stats"));

// Quotations: nhóm endpoint công khai (trang hợp đồng khách tự mở) phải
// được đăng ký TRƯỚC nhóm cần đăng nhập, nếu không khách sẽ bị 401.
const quotationRoutes = require("./routes/quotations");
app.use("/api/quotations", quotationRoutes.publicRouter);
app.use("/api/quotations", authMiddleware, quotationRoutes);

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

// Khởi động: tạo bảng + seed dữ liệu trước, rồi mới mở cổng
async function start() {
  try {
    await initDb();
    const { seedProducts } = require("./seed");
    console.log("🌱 Checking seed data...");
    await seedProducts();
  } catch (e) {
    console.log("⚠️ Khởi tạo dữ liệu thất bại:", e.message);
  }

  app.listen(PORT, "0.0.0.0", () => {
    const dbLabel = DB_URL.startsWith("file:") ? "file (local)" : "Turso (remote)";

    // Cảnh báo bảo mật: nếu thiếu JWT_SECRET, token được ký bằng chuỗi mặc định
    // nằm ngay trong mã nguồn công khai => ai cũng giả được token quản trị.
    if (!process.env.JWT_SECRET) {
      console.log("");
      console.log("⚠️  CẢNH BÁO BẢO MẬT: chưa đặt biến môi trường JWT_SECRET.");
      console.log("    Hệ thống đang dùng chuỗi mặc định đã công khai trong mã nguồn,");
      console.log("    nghĩa là bất kỳ ai đọc được repo cũng tạo được token quản trị giả.");
      console.log("    ➜ Đặt JWT_SECRET (Render → Environment) trước khi công khai.");
      console.log("");
    }

    console.log(`
╔══════════════════════════════════════════╗
║        🌿 VƯỜN PHỐ Server               ║
║──────────────────────────────────────────║
║  URL:   http://localhost:${PORT}          ║
║  Admin: http://localhost:${PORT}/admin    ║
║  API:   http://localhost:${PORT}/api      ║
║  DB:    ${dbLabel}
╚══════════════════════════════════════════╝
  `);
  });
}

start();
