const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDatabase } = require("../database");
const { customerAuth, generateCustomerToken } = require("../middleware/customer-auth");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9 +().-]{8,15}$/;

/** Ghi 1 event phục vụ đo lường OC2 (không làm hỏng request nếu lỗi) */
async function track(type, customerId, source) {
  try {
    const db = getDatabase();
    await db.run("INSERT INTO events (type, label, customer_id, source) VALUES (?, ?, ?, ?)", [
      type,
      "account",
      customerId,
      source || "",
    ]);
  } catch (e) {
    console.error("track error:", e.message);
  }
}

/** Chỉ trả về các trường an toàn (không bao giờ trả password) */
function publicCustomer(c) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    house_type: c.house_type,
    area: c.area,
    budget: c.budget,
    goal: c.goal,
    created_at: c.created_at,
  };
}

// POST /api/customers/register — Đăng ký tài khoản khách hàng
router.post("/register", async (req, res) => {
  try {
    const { name, phone, email, password, house_type, area, budget, goal, source } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Vui lòng nhập họ và tên." });
    }
    if (!phone || !PHONE_RE.test(phone.trim())) {
      return res.status(400).json({ error: "Số điện thoại chưa hợp lệ." });
    }
    if (!email || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ error: "Email chưa hợp lệ." });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    const db = getDatabase();
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.get("SELECT id FROM customers WHERE email = ?", [normalizedEmail]);
    if (existing) {
      return res.status(409).json({ error: "Email này đã được đăng ký. Vui lòng đăng nhập." });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const result = await db.run(
      `INSERT INTO customers (name, phone, email, password, house_type, area, budget, goal, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        phone.trim(),
        normalizedEmail,
        hashed,
        house_type || "",
        area || "",
        budget || "",
        goal || "",
        source || "",
      ]
    );

    const customer = await db.get("SELECT * FROM customers WHERE id = ?", [
      result.lastInsertRowid,
    ]);
    await track("register", customer.id, source);

    res.status(201).json({
      success: true,
      message: "Đăng ký thành công.",
      data: { token: generateCustomerToken(customer), user: publicCustomer(customer) },
    });
  } catch (error) {
    console.error("POST /api/customers/register error:", error);
    res.status(500).json({ error: "Lỗi server, vui lòng thử lại sau." });
  }
});

// POST /api/customers/login — Đăng nhập
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Vui lòng nhập email và mật khẩu." });
    }

    const db = getDatabase();
    const customer = await db.get("SELECT * FROM customers WHERE email = ?", [
      email.trim().toLowerCase(),
    ]);

    if (!customer || !bcrypt.compareSync(password, customer.password)) {
      return res.status(401).json({ error: "Email hoặc mật khẩu không đúng." });
    }

    await track("login", customer.id, "");

    res.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: { token: generateCustomerToken(customer), user: publicCustomer(customer) },
    });
  } catch (error) {
    console.error("POST /api/customers/login error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/customers/me — Hồ sơ của tôi
router.get("/me", customerAuth, async (req, res) => {
  try {
    const db = getDatabase();
    const customer = await db.get("SELECT * FROM customers WHERE id = ?", [req.customer.id]);

    if (!customer) {
      return res.status(404).json({ error: "Tài khoản không tồn tại." });
    }

    res.json({ data: publicCustomer(customer) });
  } catch (error) {
    console.error("GET /api/customers/me error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PUT /api/customers/me — Cập nhật hồ sơ
router.put("/me", customerAuth, async (req, res) => {
  try {
    const { name, phone, house_type, area, budget, goal } = req.body;

    if (name !== undefined && !name.trim()) {
      return res.status(400).json({ error: "Họ và tên không được để trống." });
    }
    if (phone !== undefined && !PHONE_RE.test(phone.trim())) {
      return res.status(400).json({ error: "Số điện thoại chưa hợp lệ." });
    }

    const db = getDatabase();
    const current = await db.get("SELECT * FROM customers WHERE id = ?", [req.customer.id]);
    if (!current) {
      return res.status(404).json({ error: "Tài khoản không tồn tại." });
    }

    await db.run(
      `UPDATE customers SET name = ?, phone = ?, house_type = ?, area = ?, budget = ?, goal = ?
       WHERE id = ?`,
      [
        name !== undefined ? name.trim() : current.name,
        phone !== undefined ? phone.trim() : current.phone,
        house_type !== undefined ? house_type : current.house_type,
        area !== undefined ? area : current.area,
        budget !== undefined ? budget : current.budget,
        goal !== undefined ? goal : current.goal,
        req.customer.id,
      ]
    );

    const updated = await db.get("SELECT * FROM customers WHERE id = ?", [req.customer.id]);
    res.json({ success: true, message: "Đã cập nhật hồ sơ.", data: publicCustomer(updated) });
  } catch (error) {
    console.error("PUT /api/customers/me error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/customers/me/requests — Yêu cầu tư vấn của tôi + báo giá kèm theo
router.get("/me/requests", customerAuth, async (req, res) => {
  try {
    const db = getDatabase();

    const requests = await db.all(
      "SELECT * FROM contacts WHERE customer_id = ? ORDER BY created_at DESC",
      [req.customer.id]
    );

    const data = [];
    for (const r of requests) {
      const quotation = await db.get("SELECT * FROM quotations WHERE contactId = ?", [r.id]);
      data.push({ ...r, quotation: quotation || null });
    }

    res.json({ data });
  } catch (error) {
    console.error("GET /api/customers/me/requests error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// POST /api/customers/me/requests — Gửi yêu cầu tư vấn mới (gắn vào tài khoản)
router.post("/me/requests", customerAuth, async (req, res) => {
  try {
    const {
      house_type,
      area,
      budget,
      goal,
      note,
      purchase_type,
      product_interest,
      source,
    } = req.body;

    const db = getDatabase();
    const customer = await db.get("SELECT * FROM customers WHERE id = ?", [req.customer.id]);

    const result = await db.run(
      `INSERT INTO contacts (name, phone, email, house_type, area, budget, goal, note, customer_id, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer.name,
        customer.phone,
        customer.email,
        house_type || customer.house_type || "",
        area || customer.area || "",
        budget || customer.budget || "",
        goal || customer.goal || "",
        [note, purchase_type ? `Nhu cầu: ${purchase_type}` : "", product_interest ? `Quan tâm: ${product_interest}` : ""]
          .filter(Boolean)
          .join(" | "),
        customer.id,
        source || customer.source || "",
      ]
    );

    await track("request", customer.id, source || customer.source);

    const created = await db.get("SELECT * FROM contacts WHERE id = ?", [
      result.lastInsertRowid,
    ]);
    res.status(201).json({ success: true, message: "Đã gửi yêu cầu tư vấn.", data: created });
  } catch (error) {
    console.error("POST /api/customers/me/requests error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
