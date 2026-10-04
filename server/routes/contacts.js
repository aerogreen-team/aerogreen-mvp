const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");
const { authMiddleware } = require("../middleware/auth");
const { optionalCustomerAuth } = require("../middleware/customer-auth");

// POST /api/contact — Create a new contact
// Khách vãng lai: customer_id = NULL (sẽ được gắn vào tài khoản khi họ đăng ký
//                bằng đúng email này — xem routes/customers.js).
// Khách đã đăng nhập: tự động gắn customer_id vào yêu cầu.
router.post("/", optionalCustomerAuth, async (req, res) => {
  try {
    const { name, phone, email, house_type, area, budget, goal, note, source } = req.body;

    if (!name || !phone) {
      return res
        .status(400)
        .json({ error: "Vui lòng nhập họ tên và số điện thoại." });
    }

    const db = getDatabase();

    // Nếu người gửi đang đăng nhập, gắn yêu cầu vào tài khoản của họ
    let customer = null;
    if (req.customer && req.customer.id) {
      customer = await db.get("SELECT * FROM customers WHERE id = ?", [req.customer.id]);
    }
    const customerId = customer ? customer.id : null;

    // Chuẩn hoá email để việc gắn lại yêu cầu theo email hoạt động chính xác
    const normalizedEmail = email
      ? email.trim().toLowerCase()
      : customer
      ? customer.email
      : "";

    const result = await db.run(
      `INSERT INTO contacts (name, phone, email, house_type, area, budget, goal, note, source, customer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone.trim(),
        normalizedEmail,
        house_type || "",
        area || "",
        budget || "",
        goal || "",
        note || "",
        source || "",
        customerId,
      ]
    );

    // Ghi nhận event phục vụ đo lường OC2 (không làm hỏng request)
    try {
      await db.run(
        "INSERT INTO events (type, label, path, source, customer_id) VALUES (?, ?, ?, ?, ?)",
        ["request", "contact_page", "/contact.html", source || "", customerId]
      );
    } catch (e) {
      console.error("track request event failed:", e.message);
    }

    res.status(201).json({
      success: true,
      message: "Đã ghi nhận thông tin. VƯỜN PHỐ sẽ liên hệ tư vấn.",
      id: result.lastInsertRowid,
      linked_to_account: !!customerId,
    });
  } catch (error) {
    console.error("POST /api/contact error:", error);
    res.status(500).json({ error: "Lỗi server, vui lòng thử lại sau." });
  }
});

// GET /api/contacts — List all contacts (admin only)
router.get("/", authMiddleware, async (req, res) => {
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

    const contacts = await db.all(query, params);
    const totalRow = await db.get(countQuery, countParams);
    const total = totalRow.total;

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
router.patch("/:id", authMiddleware, async (req, res) => {
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
    const result = await db.run("UPDATE contacts SET status = ? WHERE id = ?", [status, id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Không tìm thấy contact." });
    }

    const contact = await db.get("SELECT * FROM contacts WHERE id = ?", [id]);

    res.json({ success: true, data: contact });
  } catch (error) {
    console.error("PATCH /api/contacts/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// DELETE /api/contacts/:id — Delete a contact (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = await db.run("DELETE FROM contacts WHERE id = ?", [id]);

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
