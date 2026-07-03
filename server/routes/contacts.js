const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");
const { authMiddleware } = require("../middleware/auth");

// POST /api/contact — Create a new contact
router.post("/", (req, res) => {
  try {
    const { name, phone, house_type, area, budget, goal, note } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập họ tên và số điện thoại." });
    }

    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO contacts (name, phone, house_type, area, budget, goal, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      name.trim(),
      phone.trim(),
      house_type || "",
      area || "",
      budget || "",
      goal || "",
      note || ""
    );

    res.status(201).json({
      success: true,
      message: "Đã ghi nhận thông tin. AeroGreen Hub sẽ liên hệ tư vấn.",
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    res.status(500).json({ error: "Lỗi server, vui lòng thử lại sau." });
  }
});

// GET /api/contacts — List all contacts (admin only)
router.get("/", authMiddleware, (req, res) => {
  try {
    const db = getDatabase();
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = "SELECT * FROM contacts";
    let countQuery = "SELECT COUNT(*) as total FROM contacts";
    const params = [];
    const countParams = [];

    if (status) {
      query += " WHERE status = ?";
      countQuery += " WHERE status = ?";
      params.push(status);
      countParams.push(status);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const contacts = db.prepare(query).all(...params);
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      data: contacts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/contacts error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PATCH /api/contacts/:id — Update contact status (admin only)
router.patch("/:id", authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "contacted", "installed", "closed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(", ")}`,
      });
    }

    const db = getDatabase();
    const result = db
      .prepare("UPDATE contacts SET status = ? WHERE id = ?")
      .run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Không tìm thấy contact." });
    }

    const contact = db
      .prepare("SELECT * FROM contacts WHERE id = ?")
      .get(id);

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error("PATCH /api/contacts/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// DELETE /api/contacts/:id — Delete a contact (admin only)
router.delete("/:id", authMiddleware, (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.prepare("DELETE FROM contacts WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Không tìm thấy contact." });
    }

    res.json({ success: true, message: "Đã xóa contact." });
  } catch (error) {
    console.error("DELETE /api/contacts/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
