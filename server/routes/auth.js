const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const { getDatabase } = require("../database");
const { authMiddleware, generateToken } = require("../middleware/auth");

// POST /api/auth/login — Đăng nhập
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Vui lòng nhập tên đăng nhập và mật khẩu." });
    }

    const db = getDatabase();
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username.trim());

    if (!user) {
      return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Tên đăng nhập hoặc mật khẩu không đúng." });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: "Đăng nhập thành công.",
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/auth/me — Kiểm tra token hiện tại
router.get("/me", authMiddleware, (req, res) => {
  try {
    const db = getDatabase();
    const user = db
      .prepare("SELECT id, username, displayName, role, created_at FROM users WHERE id = ?")
      .get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: "Người dùng không tồn tại." });
    }

    res.json({ data: user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// PUT /api/auth/change-password — Đổi mật khẩu
router.put("/change-password", authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Vui lòng nhập mật khẩu cũ và mật khẩu mới." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const db = getDatabase();
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user.id);

    if (!bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(400).json({ error: "Mật khẩu cũ không đúng." });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, req.user.id);

    res.json({ success: true, message: "Đổi mật khẩu thành công." });
  } catch (error) {
    console.error("PUT /api/auth/change-password error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
