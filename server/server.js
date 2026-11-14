const path = require("path");
const express = require("express");

const app = require("../app");
const { initDb, DB_URL } = require("./database");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");

/**
 * Bootstrap cho môi trường chạy dài hạn (local, Docker, Render).
 *
 * Trên Vercel, CDN phục vụ `public/**` và `vercel.json` lo các rewrite, nên file
 * này không được dùng tới. Ở đây ta tự gắn lại phần file tĩnh + các đường dẫn
 * đẹp mà trước kia nằm trong `server.js`.
 */

app.use(express.static(PUBLIC_DIR));

// Tương thích đường dẫn cũ "public/images/..." vẫn còn trong DB (cover_image…),
// đồng thời khớp rewrite tương ứng trong vercel.json.
app.use("/public", express.static(PUBLIC_DIR));

// Ảnh admin upload khi chưa cấu hình object storage.
const uploadRoutes = require("./routes/uploads");
app.use(uploadRoutes.PUBLIC_PREFIX, express.static(uploadRoutes.UPLOAD_DIR));

// Trang đăng nhập quản trị (tách với /login.html là trang đăng nhập khách hàng).
app.get("/login", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "admin", "login.html"));
});

// Trang hợp đồng công khai
app.get("/hop-dong", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "contract.html"));
});

// Khởi động: tạo bảng + seed dữ liệu trước, rồi mới mở cổng
async function start() {
  try {
    await initDb();
    const { seedProducts, seedPages } = require("./seed");
    console.log("🌱 Checking seed data...");
    await seedProducts();
    await seedPages();
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
