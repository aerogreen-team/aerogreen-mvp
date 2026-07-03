const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "aerogreen_hub_secret_key_2026";

/**
 * Middleware: Verify JWT token from Authorization header
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Vui lòng đăng nhập để tiếp tục." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại." });
  }
}

/**
 * Generate a JWT token for a user
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

module.exports = { authMiddleware, generateToken, JWT_SECRET };
