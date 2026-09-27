const express = require("express");
const router = express.Router();

/**
 * Router công khai CHỈ chứa các endpoint khách hàng cần tự truy cập
 * (trang hợp đồng mở bằng link chia sẻ).
 * Được mount TRƯỚC router cần auth trong server.js.
 *
 * Lưu ý bảo mật: requestId dạng AGH001 có thể đoán được. Với MVP thì chấp nhận
 * vì link hợp đồng được gửi trực tiếp cho khách; khi mở rộng nên đổi sang token ngẫu nhiên.
 */
const publicRouter = express.Router();
const { getDatabase } = require("../database");

/**
 * Generate requestId: AGH + contactId (padded to 3 digits)
 * Example: contactId=1 → AGH001
 */
function generateRequestId(contactId) {
  return "AGH" + String(contactId).padStart(3, "0");
}

// POST /api/quotations — Tạo báo giá mới
router.post("/", async (req, res) => {
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
    const contact = await db.get("SELECT id FROM contacts WHERE id = ?", [contactId]);
    if (!contact) {
      return res.status(404).json({ error: "Không tìm thấy yêu cầu tư vấn." });
    }

    const requestId = generateRequestId(contactId);

    // Check if quotation already exists for this contact
    const existing = await db.get("SELECT id FROM quotations WHERE contactId = ?", [contactId]);
    if (existing) {
      return res
        .status(409)
        .json({ error: "Báo giá cho yêu cầu này đã tồn tại. Vui lòng cập nhật báo giá cũ.", existingId: existing.id });
    }

    const result = await db.run(
      `INSERT INTO quotations (requestId, contactId, equipmentPrice, installPrice, nutrientPrice, totalAmount, depositPercent, depositAmount, remainingAmount, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        requestId,
        contactId,
        eq,
        ins,
        nut,
        totalAmount,
        pct,
        depositAmount,
        remainingAmount,
        note || "",
      ]
    );

    const quotation = await db.get("SELECT * FROM quotations WHERE id = ?", [
      result.lastInsertRowid,
    ]);

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
router.put("/:id", async (req, res) => {
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

    const existing = await db.get("SELECT * FROM quotations WHERE id = ?", [id]);
    if (!existing) {
      return res.status(404).json({ error: "Không tìm thấy báo giá." });
    }

    await db.run(
      `UPDATE quotations
       SET equipmentPrice = ?, installPrice = ?, nutrientPrice = ?,
           totalAmount = ?, depositPercent = ?, depositAmount = ?,
           remainingAmount = ?, note = ?,
           updated_at = datetime('now', '+7 hours')
       WHERE id = ?`,
      [eq, ins, nut, totalAmount, pct, depositAmount, remainingAmount, note || "", id]
    );

    const quotation = await db.get("SELECT * FROM quotations WHERE id = ?", [id]);

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
router.patch("/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["draft", "sent", "deposit_paid", "confirmed", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Trạng thái không hợp lệ. Chấp nhận: ${validStatuses.join(", ")}` });
    }

    const db = getDatabase();
    const result = await db.run(
      "UPDATE quotations SET status = ?, updated_at = datetime('now', '+7 hours') WHERE id = ?",
      [status, id]
    );

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
router.get("/", async (req, res) => {
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

    const quotations = await db.all(query, params);
    const countParams = status ? [status] : [];
    const totalRow = await db.get(countQuery, countParams);
    const total = totalRow.total;

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
publicRouter.get("/by-request/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    const db = getDatabase();

    const quotation = await db.get(
      `SELECT q.*, c.name as contactName, c.phone as contactPhone
       FROM quotations q
       LEFT JOIN contacts c ON q.contactId = c.id
       WHERE q.requestId = ?`,
      [requestId]
    );

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
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const quotation = await db.get(
      `SELECT q.*, c.name as contactName, c.phone as contactPhone
       FROM quotations q
       LEFT JOIN contacts c ON q.contactId = c.id
       WHERE q.id = ?`,
      [id]
    );

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
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.run("DELETE FROM quotations WHERE id = ?", [id]);

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
module.exports.publicRouter = publicRouter;
