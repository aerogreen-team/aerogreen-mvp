const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const imageStore = require("../lib/storage");

/**
 * Upload ảnh cho trang quản trị — dùng cho ảnh bìa và ảnh chèn trong nội dung bài.
 *
 * Có cấu hình object storage (BLOB_READ_WRITE_TOKEN) thì ảnh được đẩy lên storage
 * và hàm trả về URL công khai. Không cấu hình thì ảnh lưu vào thư mục tĩnh
 * `public/images/uploads` như trước — chỉ dùng được khi chạy trên máy có ổ đĩa.
 *
 * ⚠️ Trên serverless (Vercel) ổ đĩa là chỉ đọc/tạm: bắt buộc phải có storage.
 */

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "..", "public", "images", "uploads");
const PUBLIC_PREFIX = (process.env.UPLOAD_PUBLIC_PREFIX || "/images/uploads").replace(/\/$/, "");
// Vercel giới hạn body 4,5 MB/request, nên để 4 MB cho phần multipart overhead.
const MAX_SIZE_MB = 4;
const USE_STORAGE = imageStore.isEnabled();
const IS_SERVERLESS = Boolean(process.env.VERCEL);

// Chỉ nhận ảnh raster. KHÔNG nhận SVG: SVG có thể chứa JavaScript và sẽ chạy
// nếu mở trực tiếp cùng origin (nguy cơ stored XSS).
const ALLOWED_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Chỉ tạo thư mục khi thật sự lưu đĩa: trên serverless thao tác này làm function crash.
if (!USE_STORAGE && !IS_SERVERLESS) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

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

/** Tên file duy nhất trên storage/đĩa, giữ đuôi theo MIME thật của ảnh. */
function buildFilename(originalname, mimetype) {
  const ext = ALLOWED_TYPES[mimetype] || ".jpg";
  const original = decodeOriginalName(originalname);
  const base = slugifyFilename(path.basename(original, path.extname(original))) || "anh";
  return `${base}-${Date.now().toString(36)}${ext}`;
}

const storageEngine = USE_STORAGE
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
      filename: (_req, file, cb) => {
        cb(null, buildFilename(file.originalname, file.mimetype));
      },
    });

const upload = multer({
  storage: storageEngine,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES[file.mimetype]) return cb(null, true);
    cb(new Error("Chỉ nhận ảnh JPG, PNG, WEBP hoặc GIF."));
  },
});

const router = express.Router();

// POST /api/uploads — nhận 1 ảnh ở field "image", trả về URL công khai
router.post("/", (req, res) => {
  if (!USE_STORAGE && IS_SERVERLESS) {
    return res.status(503).json({
      error: "Chưa cấu hình kho lưu trữ ảnh (BLOB_READ_WRITE_TOKEN). Vui lòng báo quản trị viên.",
    });
  }

  upload.single("image")(req, res, async (err) => {
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

    if (!USE_STORAGE) {
      return res.status(201).json({
        data: {
          url: `${PUBLIC_PREFIX}/${req.file.filename}`,
          filename: req.file.filename,
          size: req.file.size,
        },
      });
    }

    const filename = buildFilename(req.file.originalname, req.file.mimetype);
    try {
      const { url } = await imageStore.saveImage({
        buffer: req.file.buffer,
        filename,
        contentType: req.file.mimetype,
      });
      res.status(201).json({ data: { url, filename, size: req.file.size } });
    } catch (uploadError) {
      console.error("Storage upload error:", uploadError && uploadError.message);
      res.status(502).json({ error: "Không tải được ảnh lên kho lưu trữ. Vui lòng thử lại." });
    }
  });
});

module.exports = router;
module.exports.UPLOAD_DIR = UPLOAD_DIR;
module.exports.PUBLIC_PREFIX = PUBLIC_PREFIX;
