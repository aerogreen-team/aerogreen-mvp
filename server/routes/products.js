const express = require("express");
const router = express.Router();
const { getDatabase } = require("../database");

// GET /api/products — List all products
router.get("/", async (req, res) => {
  try {
    const db = getDatabase();
    const products = await db.all("SELECT * FROM products ORDER BY price ASC");
    res.json({ data: products });
  } catch (error) {
    console.error("GET /api/products error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/products/:id — Get single product
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const product = await db.get("SELECT * FROM products WHERE id = ?", [id]);

    if (!product) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }

    res.json({ data: product });
  } catch (error) {
    console.error("GET /api/products/:id error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

// GET /api/products/compare?ids=1,2,3 — Compare products
router.get("/compare/list", async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({ error: "Thiếu tham số ids." });
    }

    const idList = ids
      .split(",")
      .map((id) => parseInt(id.trim()))
      .filter((id) => !isNaN(id));

    if (idList.length === 0) {
      return res.status(400).json({ error: "ids không hợp lệ." });
    }

    const db = getDatabase();
    const placeholders = idList.map(() => "?").join(",");
    const products = await db.all(
      `SELECT * FROM products WHERE id IN (${placeholders})`,
      idList
    );

    if (products.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy sản phẩm." });
    }

    res.json({ data: products });
  } catch (error) {
    console.error("GET /api/products/compare error:", error);
    res.status(500).json({ error: "Lỗi server." });
  }
});

module.exports = router;
