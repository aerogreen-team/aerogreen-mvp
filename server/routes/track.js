const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");

const MAX_LEN = 60;
const cut = (v) => (typeof v === "string" ? v.slice(0, MAX_LEN) : "");

/**
 * POST /api/track — Ghi nhận lượt truy cập / hành vi trên website.
 * Public (không cần đăng nhập) vì đây là số liệu đo lường cho Outcome 2:
 * visit, nguồn kênh (utm_source), lượt dùng công cụ, lượt gửi yêu cầu…
 */
router.post("/", async (req, res) => {
  try {
    const { type, path, label, visitor_id, source, medium, campaign, customer_id } = req.body;

    const db = getDatabase();
    await db.run(
      `INSERT INTO events (type, path, label, visitor_id, customer_id, source, medium, campaign)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cut(type) || "page_view",
        cut(path),
        cut(label),
        cut(visitor_id),
        Number.isInteger(customer_id) ? customer_id : null,
        cut(source),
        cut(medium),
        cut(campaign),
      ]
    );

    res.status(201).json({ success: true });
  } catch (error) {
    console.error("POST /api/track error:", error);
    // Không chặn trải nghiệm người dùng vì lỗi đo lường
    res.status(200).json({ success: false });
  }
});

module.exports = router;
