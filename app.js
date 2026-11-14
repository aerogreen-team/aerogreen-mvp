const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { initDb } = require("./server/database");
const { authMiddleware } = require("./server/middleware/auth");

/**
 * Express app dùng chung cho mọi môi trường.
 *
 * Trên Vercel, file này là entry point (Vercel nhận diện Express qua `app.js` ở gốc
 * repo) và phải export app thay vì tự mở cổng. Khi chạy local, `server/server.js`
 * require app này rồi mới gắn thêm phần phục vụ file tĩnh + `listen`.
 *
 * Vì vậy KHÔNG đặt `express.static()` hay `res.sendFile()` ở đây: Vercel bỏ qua
 * `express.static()` và chỉ phục vụ file trong `public/` qua CDN.
 */

const app = express();

// Vercel chạy sau proxy: cần để req.protocol / req.ip phản ánh đúng client.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Mỗi instance serverless có thể bị gọi request đầu tiên bất kỳ lúc nào, nên khởi
// tạo bảng (idempotent, đã memoized) ở đây thay vì lúc boot như bản chạy dài hạn.
app.use((req, res, next) => {
  initDb().then(() => next(), next);
});

// API Routes — Public (no auth required)
app.use("/api/auth", require("./server/routes/auth"));
app.use("/api/customers", require("./server/routes/customers"));
app.use("/api/track", require("./server/routes/track"));
app.use("/api/contact", require("./server/routes/contacts"));
app.use("/api/contacts", require("./server/routes/contacts"));
app.use("/api/products", require("./server/routes/products"));
app.use("/api/recommend", require("./server/routes/recommend"));

// Bài viết: đọc công khai (chỉ bản đã xuất bản), quản trị yêu cầu đăng nhập
const pageRoutes = require("./server/routes/pages");
app.use("/api/pages", pageRoutes.publicRouter);
app.use("/api/pages", authMiddleware, pageRoutes);

// API Routes — Protected (auth required)
app.use("/api/stats", authMiddleware, require("./server/routes/stats"));

// Upload ảnh cho trình soạn bài viết — chỉ admin đã đăng nhập.
const uploadRoutes = require("./server/routes/uploads");
app.use("/api/uploads", authMiddleware, uploadRoutes);

// Quotations: nhóm endpoint công khai (trang hợp đồng khách tự mở) phải
// được đăng ký TRƯỚC nhóm cần đăng nhập, nếu không khách sẽ bị 401.
const quotationRoutes = require("./server/routes/quotations");
app.use("/api/quotations", quotationRoutes.publicRouter);
app.use("/api/quotations", authMiddleware, quotationRoutes);

// API root — welcome message
app.get("/api", (req, res) => {
  res.json({
    name: "VƯỜN PHỐ API",
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
      pages: "GET /api/pages",
      pageBySlug: "GET /api/pages/:slug",
      pageCreate: "POST /api/pages (cần đăng nhập)",
      pageUpdate: "PUT /api/pages/:id (cần đăng nhập)",
      pageDelete: "DELETE /api/pages/:id (cần đăng nhập)",
      upload: "POST /api/uploads (cần đăng nhập, field 'image')",
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

// Trên Vercel, function được mount tại "/" nên request vào "/" luôn rơi vào đây
// (CDN chỉ phục vụ các đường dẫn file cụ thể). Đọc sẵn index.html để bundler đóng
// gói kèm function; khi chạy local, server/server.js đã phục vụ file tĩnh.
if (process.env.VERCEL) {
  const indexHtml = fs.readFileSync(path.join(__dirname, "public", "index.html"));
  app.get("/", (req, res) => {
    res.type("html").send(indexHtml);
  });
}

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: "Lỗi máy chủ." });
});

module.exports = app;
