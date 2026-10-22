const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

/**
 * Upload ảnh cho trang quản trị — dùng cho ảnh bìa và ảnh chèn trong nội dung bài.
 *
 * Ảnh lưu vào thư mục tĩnh mà `express.static` đang phục vụ (mặc định `images/uploads`),
 * hàm trả về đường dẫn công khai để lưu vào DB.
 *
 * ⚠️ Trên hosting có ổ đĩa tạm (vd Render), thư mục này mất khi deploy lại.
 *    Cách xử lý: đặt `UPLOAD_DIR` trỏ tới ổ đĩa gắn ngoài, hoặc commit ảnh vào repo
 *    (chỉ cần đổi UPLOAD_PUBLIC_PREFIX nếu thư mục không còn nằm trong `images/uploads`).
 */

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "images", "uploads");
const PUBLIC_PREFIX = (process.env.UPLOAD_PUBLIC_PREFIX || "/images/uploads").replace(/\/$/, "");
const MAX_SIZE_MB = 5;

// Chỉ nhận ảnh raster. KHÔNG nhận SVG: SVG có thể chứa JavaScript và sẽ chạy
// nếu mở trực tiếp cùng origin (nguy cơ stored XSS).
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** "Ảnh bìa Family Kit.PNG" → "anh-bia-family-kit" */
function slugifyFilename(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * busboy đọc tên file theo latin1, nên tên có dấu tiếng Việt bị méo
 * ("Ảnh" → "áº¢nh"). Giải mã lại thành UTF-8 nếu kết quả hợp lệ.
 */
function decodeOriginalName(name) {
  const raw = String(name || "");
  const fixed = Buffer.from(raw, "latin1").toString("utf8");
  return fixed.includes("\uFFFD") ? raw : fixed;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED_TYPES[file.mimetype] || ".jpg";
    const original = decodeOriginalName(file.originalname);
    const base = slugifyFilename(path.basename(original, path.extname(original))) || "anh";
    cb(null, `${base}-${Date.now().toString(36)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF."));
  },
});

const router = express.Router();

// POST /api/uploads — nhận 1 ảnh ở field "image", trả về đường dẫn công khai
router.post("/", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? `Ảnh vượt quá ${MAX_SIZE_MB}MB, vui lòng chọn ảnh nhỏ hơn.`
          : err.message || "Không tải được ảnh.";
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Chưa chọn ảnh." });
    }

    res.status(201).json({
      data: {
        url: `${PUBLIC_PREFIX}/${req.file.filename}`,
        filename: req.file.filename,
        size: req.file.size,
      },
    });
  });
});

module.exports = router;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.PUBLIC_PREFIX = PUBLIC_PREFIX;
