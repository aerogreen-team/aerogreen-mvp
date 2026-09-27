const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");

// GET /api/recommend?house_type=...&area=...&budget=...
router.get("/", async (req, res) => {
  try {
    const { house_type, area, budget } = req.query;
    const db = getDatabase();
    const products = await db.all("SELECT * FROM products ORDER BY price ASC");

    let recommended = null;
    let reason = "";

    if (
      house_type === "chungcu" ||
      area === "small" ||
      budget === "low"
    ) {
      recommended = products.find((p) => p.name === "Mini Kit") || products[0];
      reason =
        "Phù hợp với chung cư, ban công nhỏ và khách hàng muốn bắt đầu trải nghiệm khí canh với chi phí vừa phải.";
    } else if (area === "medium" || budget === "mid") {
      recommended = products.find((p) => p.name === "Family Kit") || products[1];
      reason =
        "Phù hợp với nhà phố hoặc căn hộ có ban công vừa, đáp ứng tốt nhu cầu trải nghiệm sống xanh cho gia đình.";
    } else if (area === "large" || budget === "high" || house_type === "nha pho") {
      recommended = products.find((p) => p.name === "Rooftop Kit") || products[2];
      reason =
        "Phù hợp với sân thượng hoặc không gian lớn, dành cho khách hàng muốn đầu tư một khu vườn khí canh tại nhà.";
    } else {
      recommended = products[1] || products[0];
      reason =
        "Dựa trên nhu cầu chung, chúng tôi đề xuất giải pháp cân bằng giữa chi phí và sản lượng.";
    }

    res.json({
      success: true,
      data: recommended,
      reason,
    });
  } catch (error) {
    console.error("GET /api/recommend error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
