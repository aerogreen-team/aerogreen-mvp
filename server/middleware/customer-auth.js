const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./auth");

/**
 * Middleware dành riêng cho tài khoản KHÁCH HÀNG (bảng `customers`).
 * Khác với authMiddleware (admin/staff) ở chỗ bắt buộc payload phải có role = "customer",
 * nhờ vậy token của admin không dùng được cho các API của khách và ngược lại.
 */
function customerAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
  }

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);

    if (decoded.role !== "customer") {
      return res.status(403).json({ error: "Tài khoản này không phải tài khoản khách hàng." });
    }

    req.customer = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
  }
}

/**
 * Giống customerAuth nhưng KHÔNG chặn khi thiếu/sai token.
 * Dùng cho endpoint công khai (vd POST /api/contact) để:
 *   - khách đã đăng nhập  → gắn yêu cầu luôn vào tài khoản (customer_id)
 *   - khách vãng lai      → chạy tiếp như bình thường (customer_id = NULL)
 */
function optionalCustomerAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

  try {
    const decoded = jwt.verify(authHeader.split(" ")[1], JWT_SECRET);
    if (decoded.role === "customer") req.customer = decoded; // { id, email, role }
  } catch (err) {
    // Token sai/hết hạn — coi như khách vãng lai, không làm hỏng form liên hệ
  }

  next();
}

/**
 * Tạo JWT cho khách hàng. Hạn 30 ngày để khách không phải đăng nhập lại liên tục.
 */
function generateCustomerToken(customer) {
  return jwt.sign(
    { id: customer.id, email: customer.email, role: "customer" },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

module.exports = { customerAuth, optionalCustomerAuth, generateCustomerToken };
