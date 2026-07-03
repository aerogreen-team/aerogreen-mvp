const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");

/**
 * Generate requestId: AGH + contactId (padded to 3 digits)
 * Example: contactId=1 → AGH001
 */
function generateRequestId(contactId) {
  return "AGH" + String(contactId).padStart(3, "0");
}

// POST /api/quotations — Tạo báo giá mới
router.post("/", (req, res) => {
  try {
    const {
      contactId,
      equipmentPrice,
      installPrice,
      nutrientPrice,
      depositPercent,
      note,
    } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: "Thiếu contactId." });
    }

    const eq = parseInt(equipmentPrice) || 0;
    const ins = parseInt(installPrice) || 0;
    const nut = parseInt(nutrientPrice) || 0;
    const pct = parseFloat(depositPercent) || 10;

    // BE tự tính
    const totalAmount = eq + ins + nut;
    const depositAmount = Math.round(totalAmount * pct / 100);
    const remainingAmount = totalAmount - depositAmount;

    const db = getDatabase();

    // Verify contact exists
    const contact = db.prepare("SELECT id FROM contacts WHERE id = ?").get(contactId);
    if (!contact) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu tư vấn." });
    }

    const requestId = generateRequestId(contactId);

    // Check if quotation already exists for this contact
    const existing = db
      .prepare("SELECT id FROM quotations WHERE contactId = ?")
      .get(contactId);
    if (existing) {
      return res
        .status(409)
        .json({ error: "Báo giá cho yêu cầu này đã tồn tại. Vui lòng cập nhật báo giá cũ.", existingId: existing.id });
    }

    const stmt = db.prepare(`
      INSERT INTO quotations (requestId, contactId, equipmentPrice, installPrice, nutrientPrice, totalAmount, depositPercent, depositAmount, remainingAmount, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      requestId,
      contactId,
      eq,
      ins,
      nut,
      totalAmount,
      pct,
      depositAmount,
      remainingAmount,
      note || ""
    );

    const quotation = db.prepare("SELECT * FROM quotations WHERE id = ?").get(result.lastInsertRowid);

    res.status(201).json({
      success: true,
      message: "Đã tạo báo giá thành công.",
      data: quotation,
    });
  } catch (error) {
    console.error("POST /api/quotations error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PUT /api/quotations/:id — Cập nhật báo giá
router.put("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const {
      equipmentPrice,
      installPrice,
      nutrientPrice,
      depositPercent,
      note,
    } = req.body;

    const eq = parseInt(equipmentPrice) || 0;
    const ins = parseInt(installPrice) || 0;
    const nut = parseInt(nutrientPrice) || 0;
    const pct = parseFloat(depositPercent) || 10;

    const totalAmount = eq + ins + nut;
    const depositAmount = Math.round(totalAmount * pct / 100);
    const remainingAmount = totalAmount - depositAmount;

    const db = getDatabase();

    const existing = db.prepare("SELECT * FROM quotations WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    db.prepare(`
      UPDATE quotations
      SET equipmentPrice = ?, installPrice = ?, nutrientPrice = ?,
          totalAmount = ?, depositPercent = ?, depositAmount = ?,
          remainingAmount = ?, note = ?,
          updated_at = datetime('now', '+7 hours')
      WHERE id = ?
    `).run(eq, ins, nut, totalAmount, pct, depositAmount, remainingAmount, note || "", id);

    const quotation = db.prepare("SELECT * FROM quotations WHERE id = ?").get(id);

    res.json({
      success: true,
      message: "Đã cập nhật báo giá.",
      data: quotation,
    });
  } catch (error) {
    console.error("PUT /api/quotations/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PATCH /api/quotations/:id/status — Cập nhật trạng thái
router.patch("/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "sent", "deposit_paid", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(", ")}` });
    }

    const db = getDatabase();
    const result = db
      .prepare("UPDATE quotations SET status = ?, updated_at = datetime('now', '+7 hours') WHERE id = ?")
      .run(status, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    res.json({ success: true, message: "Đã cập nhật trạng thái." });
  } catch (error) {
    console.error("PATCH /api/quotations/:id/status error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/quotations — Danh sách tất cả báo giá (admin)
router.get("/", (req, res) => {
  try {
    const db = getDatabase();
    const { status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT q.*, c.name as contactName, c.phone as contactPhone
      FROM quotations q
      LEFT JOIN contacts c ON q.contactId = c.id
    `;
    let countQuery = "SELECT COUNT(*) as total FROM quotations";
    const params = [];

    if (status) {
      query += " WHERE q.status = ?";
      countQuery += " WHERE status = ?";
      params.push(status);
    }

    query += " ORDER BY q.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const quotations = db.prepare(query).all(...params);
    const countParams = status ? [status] : [];
    const { total } = db.prepare(countQuery).get(...countParams);

    res.json({
      data: quotations,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/quotations error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/quotations/by-request/:requestId — Lấy báo giá theo requestId (trang hợp đồng)
router.get("/by-request/:requestId", (req, res) => {
  try {
    const { requestId } = req.params;
    const db = getDatabase();

    const quotation = db
      .prepare(`
        SELECT q.*, c.name as contactName, c.phone as contactPhone
        FROM quotations q
        LEFT JOIN contacts c ON q.contactId = c.id
        WHERE q.requestId = ?
      `)
      .get(requestId);

    if (!quotation) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    res.json({ data: quotation });
  } catch (error) {
    console.error("GET /api/quotations/by-request/:requestId error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/quotations/:id — Lấy báo giá theo ID
router.get("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const quotation = db
      .prepare(`
        SELECT q.*, c.name as contactName, c.phone as contactPhone
        FROM quotations q
        LEFT JOIN contacts c ON q.contactId = c.id
        WHERE q.id = ?
      `)
      .get(id);

    if (!quotation) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    res.json({ data: quotation });
  } catch (error) {
    console.error("GET /api/quotations/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// DELETE /api/quotations/:id — Xóa báo giá
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.prepare("DELETE FROM quotations WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    res.json({ success: true, message: "Đã xóa báo giá." });
  } catch (error) {
    console.error("DELETE /api/quotations/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
