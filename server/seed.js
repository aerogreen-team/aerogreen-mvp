const { db, client, initDb } = require("./database");

// Danh sách sản phẩm mẫu — dùng chung cho `npm run seed` và auto-seed khi server khởi động
const PRODUCTS = [
  {
    name: "Mini Kit",
    description:
      "Lý tưởng cho căn hộ và ban công nhỏ. Tự trồng rau thơm và rau ăn lá với diện tích tối thiểu.",
    holes: 20,
    suitable_for: "Ban công / Căn hộ nhỏ",
    size: "40cm x 40cm x 120cm",
    price: 5990000,
    price_label: "5.990.000₫",
    image: "../images/tower.png",
    features: JSON.stringify([
      "20 lỗ trồng",
      "Phù hợp ban công nhỏ",
      "Dễ lắp đặt",
      "Bảo trì tối thiểu",
    ]),
  },
  {
    name: "Family Kit",
    description:
      "Mẫu bán chạy nhất. Đủ sản lượng cung cấp rau sạch cho cả gia đình mỗi ngày.",
    holes: 40,
    suitable_for: "Gia đình 4–6 người",
    size: "60cm x 60cm x 160cm",
    price: 8490000,
    price_label: "8.490.000₫",
    image: "../images/Family Kit.png",
    features: JSON.stringify([
      "40 lỗ trồng",
      "Phù hợp gia đình 4-6 người",
      "Sản lượng cao",
      "Thiết kế chắc chắn",
    ]),
  },
  {
    name: "Rooftop Kit",
    description:
      "Năng suất tối đa cho những ai muốn xây dựng vườn rau đô thị thực sự trên sân thượng.",
    holes: 80,
    suitable_for: "Sân thượng / Diện tích lớn",
    size: "100cm x 100cm x 180cm",
    price: 12990000,
    price_label: "12.990.000₫",
    image: "../images/Rooftop Kit.png",
    features: JSON.stringify([
      "80 lỗ trồng",
      "Phù hợp sân thượng",
      "Năng suất tối đa",
      "Hệ thống tưới tự động",
    ]),
  },
];

/**
 * Seed sản phẩm mẫu nếu bảng products đang trống.
 *
 * Lưu ý: KHÔNG gọi process.exit() ở đây — server.js gọi hàm này lúc khởi động,
 * nếu exit thì tiến trình server sẽ chết ngay khi DB còn trống.
 *
 * @returns {number} số sản phẩm đã thêm (0 nếu đã có dữ liệu)
 */
async function seedProducts() {
  const count = await db.get("SELECT COUNT(*) as cnt FROM products");
  if (Number(count && count.cnt) > 0) {
    console.log("✅ Database already has products. Skipping seed.");
    return 0;
  }

  // client.batch gửi tất cả trong 1 transaction
  await client.batch(
    PRODUCTS.map((p) => ({
      sql: `INSERT INTO products (name, description, holes, suitable_for, size, price, price_label, image, features)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        p.name,
        p.description,
        p.holes,
        p.suitable_for,
        p.size,
        p.price,
        p.price_label,
        p.image,
        p.features,
      ],
    })),
    "write"
  );

  console.log("✅ Seeded", PRODUCTS.length, "products successfully.");
  return PRODUCTS.length;
}

// Chạy trực tiếp: `node seed.js` hoặc `npm run seed`
if (require.main === module) {
  (async () => {
    await initDb();
    await seedProducts();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Seed thất bại:", err.message);
    process.exit(1);
  });
}

module.exports = { seedProducts, PRODUCTS };
