const express = require("express");
const jwt = require("jsonwebtoken");
const { getDatabase } = require("../database");
const { JWT_SECRET } = require("../middleware/auth");

/**
 * Nội dung trang (content pages) — dùng cho tính năng "tạo trang nội dung" trong admin.
 *
 * Định dạng `body` là văn bản thuần theo quy ước mini-markdown (an toàn hơn cho phép HTML thô):
 *   - Dòng trống ngăn cách các đoạn văn.
 *   - "## Tiêu đề"  → tiêu đề mục cấp 2.
 *   - "### Tiêu đề" → tiêu đề mục cấp 3.
 *   - "- Gạch đầu dòng" → danh sách.
 * Frontend (js/content-page.js) chuyển quy ước này thành HTML và escape toàn bộ nội dung.
 */

// Router công khai — GET danh sách (chỉ bản đã xuất bản) + GET chi tiết theo slug
const publicRouter = express.Router();
// Router quản trị — tạo / sửa / xoá; server.js gắn authMiddleware phía trước
const adminRouter = express.Router();

/**
 * Gắn `req.user` nếu request có token hợp lệ, nhưng KHÔNG chặn khi thiếu token.
 * Nhờ vậy `GET /api/pages` phục vụ cả hai: khách chỉ thấy bản đã xuất bản,
 * admin (có token) thấy đầy đủ cả bản nháp — không cần thêm endpoint riêng.
 */
function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      req.user = jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch {
      // token sai/hết hạn → coi như khách, vẫn trả về bản đã xuất bản
    }
  }
  next();
}

const CATEGORIES = ["bo-khi-canh", "kien-thuc", "huong-dan"];
const MAX_TITLE = 200;
const MAX_SUMMARY = 400;

/** "Hệ khí canh Mini Kit" → "he-khi-canh-mini-kit" */
function slugify(input) {
  return String(input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Chuẩn hoá + kiểm tra dữ liệu gửi lên. Trả { error } hoặc { values }. */
function buildPayload(body) {
  const title = String(body.title || "").trim();
  if (!title) return { error: "Vui lòng nhập tiêu đề trang." };
  if (title.length > MAX_TITLE) return { error: `Tiêu đề tối đa ${MAX_TITLE} ký tự.` };

  const slug = slugify(body.slug || title);
  if (!slug) return { error: "Không tạo được slug hợp lệ, vui lòng nhập slug thủ công." };

  const publishedRaw = body.published;
  const published =
    publishedRaw === false || publishedRaw === 0 || publishedRaw === "0" || publishedRaw === "false"
      ? 0
      : 1;

  const sortOrder = Number(body.sort_order);

  return {
    values: {
      slug,
      title,
      summary: String(body.summary || "").trim().slice(0, MAX_SUMMARY),
      category: CATEGORIES.includes(body.category) ? body.category : "kien-thuc",
      cover_image: String(body.cover_image || "").trim().slice(0, 300),
      body: String(body.body || "").trim(),
      related_product: String(body.related_product || "").trim().slice(0, 120),
      sort_order: Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0,
      published,
    },
  };
}

/* ===================== Công khai ===================== */

// GET /api/pages — danh sách trang
//   • Khách: chỉ bản đã xuất bản, không kèm `body` cho nhẹ
//   • Admin (gửi kèm token): tất cả, gồm cả bản nháp và `body`
publicRouter.get("/", optionalAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const rows = req.user
      ? await db.all("SELECT * FROM content_pages ORDER BY sort_order ASC, id DESC")
      : await db.all(
          `SELECT id, slug, title, summary, category, cover_image, related_product, sort_order, updated_at
           FROM content_pages WHERE published = 1 ORDER BY sort_order ASC, id DESC`
        );
    res.json({ data: rows });
  } catch (error) {
    console.error("GET /api/pages error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/pages/:slug — chi tiết một trang đã xuất bản
publicRouter.get("/:slug", async (req, res) => {
  try {
    const db = getDatabase();
    const page = await db.get(
      "SELECT * FROM content_pages WHERE slug = ? AND published = 1",
      [req.params.slug]
    );
    if (!page) {
      return res.status(404).json({ error: "Không tìm thấy nội dung." });
    }
    res.json({ data: page });
  } catch (error) {
    console.error("GET /api/pages/:slug error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

/* ===================== Quản trị (server.js gắn authMiddleware) ===================== */

// POST /api/pages — tạo trang nội dung mới
adminRouter.post("/", async (req, res) => {
  try {
    const { values, error } = buildPayload(req.body || {});
    if (error) return res.status(400).json({ error });

    const db = getDatabase();
    const existing = await db.get("SELECT id FROM content_pages WHERE slug = ?", [values.slug]);
    if (existing) {
      return res.status(409).json({
        error: `Slug "${values.slug}" đã được dùng cho trang khác. Vui lòng chọn slug khác.`,
      });
    }

    const result = await db.run(
      `INSERT INTO content_pages (slug, title, summary, category, cover_image, body, related_product, sort_order, published)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        values.slug,
        values.title,
        values.summary,
        values.category,
        values.cover_image,
        values.body,
        values.related_product,
        values.sort_order,
        values.published,
      ]
    );

    const created = await db.get("SELECT * FROM content_pages WHERE id = ?", [
      result.lastInsertRowid,
    ]);
    res.status(201).json({ data: created });
  } catch (error) {
    console.error("POST /api/pages error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PUT /api/pages/:id — cập nhật trang nội dung
adminRouter.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const current = await db.get("SELECT * FROM content_pages WHERE id = ?", [id]);
    if (!current) {
      return res.status(404).json({ error: "Không tìm thấy trang nội dung." });
    }

    const { values, error } = buildPayload(req.body || {});
    if (error) return res.status(400).json({ error });

    const duplicate = await db.get(
      "SELECT id FROM content_pages WHERE slug = ? AND id <> ?",
      [values.slug, id]
    );
    if (duplicate) {
      return res.status(409).json({
        error: `Slug "${values.slug}" đã được dùng cho trang khác. Vui lòng chọn slug khác.`,
      });
    }

    await db.run(
      `UPDATE content_pages
       SET slug = ?, title = ?, summary = ?, category = ?, cover_image = ?, body = ?,
           related_product = ?, sort_order = ?, published = ?, updated_at = datetime('now', '+7 hours')
       WHERE id = ?`,
      [
        values.slug,
        values.title,
        values.summary,
        values.category,
        values.cover_image,
        values.body,
        values.related_product,
        values.sort_order,
        values.published,
        id,
      ]
    );

    const updated = await db.get("SELECT * FROM content_pages WHERE id = ?", [id]);
    res.json({ data: updated });
  } catch (error) {
    console.error("PUT /api/pages/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// DELETE /api/pages/:id — xoá trang nội dung
adminRouter.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const current = await db.get("SELECT id FROM content_pages WHERE id = ?", [id]);
    if (!current) {
      return res.status(404).json({ error: "Không tìm thấy trang nội dung." });
    }

    await db.run("DELETE FROM content_pages WHERE id = ?", [id]);
    res.json({ data: { id: Number(id) }, message: "Đã xoá trang nội dung." });
  } catch (error) {
    console.error("DELETE /api/pages/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = adminRouter;
module.exports.publicRouter = publicRouter;
