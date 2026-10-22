const { db, client, initDb } = require("./database");

// Danh sách sản phẩm mẫu — dùng chung cho `npm run seed` và auto-seed khi server khởi động
const { products: packageCatalog } = require("../js/package-catalog");
const PRODUCTS = packageCatalog.map(({ imageFile, features, ...product }) => ({
  ...product,
  image: "../images/" + imageFile + ".webp",
  features: JSON.stringify(features),
}));

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

// Bài viết mẫu — minh hoạ tính năng "tạo bài viết" trong admin.
// `body` theo quy ước: dòng trống ngăn đoạn, "## " là tiêu đề mục, "- " là gạch đầu dòng.
const PAGES = [
  {
    slug: "kinh-nghiem-chon-vi-tri-dat-he-khi-canh",
    title: "Kinh nghiệm chọn vị trí đặt hệ khí canh",
    summary:
      "Ánh sáng, độ thoáng, nguồn điện – nước và khả năng chịu tải — bốn yếu tố quyết định hệ khí canh chạy tốt quanh năm.",
    category: "huong-dan",
    related_product: "Mini Kit",
    sort_order: 1,
    body: `Vị trí đặt hệ quyết định gần như toàn bộ năng suất rau. Một hệ khí canh tốt nhưng đặt sai chỗ vẫn cho rau còi, lá nhạt và dễ bị sâu bệnh.

## Bốn yếu tố cần kiểm tra

### 1. Ánh sáng
- Rau ăn lá cần tối thiểu 4 giờ nắng trực tiếp, hoặc 12–16 giờ đèn LED mỗi ngày.
- Tránh nơi nắng gắt chiếu thẳng vào bồn dung dịch vì tảo sẽ phát triển nhanh.

### 2. Thông thoáng và gió
- Khoang rễ cần thoáng để không bị nấm khi độ ẩm cao.
- Tránh đặt sát góc kín gió hoặc ngay dưới luồng máy lạnh.

### 3. Nguồn điện và nước
- Dùng ổ cắm có tiếp địa, tránh vị trí nước có thể bắn trực tiếp vào phích cắm.
- Nên đặt gần nguồn nước để pha dung dịch và vệ sinh bồn.

### 4. Khả năng chịu tải
- Một hệ đầy nước có thể nặng 150–400kg. Với sân thượng, nên đặt hệ dọc theo dầm chịu lực.

## Gợi ý theo từng không gian
- Ban công nhỏ: đặt áp lan can, quay khoang rễ vào trong để tránh mưa tạt.
- Sân thượng: xếp hệ thành dãy, cách tường 30–50cm để lấy gió.
- Trong nhà: cần đèn LED trồng cây và quạt đối lưu nhẹ.

VƯỜN PHỐ khảo sát trực tiếp các yếu tố này trước khi chốt phương án, nên bạn không cần tự tính toán.`,
  },
  {
    slug: "pha-dung-dich-dinh-duong-a-b-dung-cach",
    title: "Pha dung dịch dinh dưỡng A–B đúng cách",
    summary:
      "Trình tự pha, nồng độ EC theo nhóm rau và cách xử lý khi cây có dấu hiệu thiếu hoặc thừa dinh dưỡng.",
    category: "huong-dan",
    related_product: "Family Kit",
    sort_order: 2,
    body: `Bộ dinh dưỡng A–B tách riêng hai thành phần vì canxi và phốt phát sẽ kết tủa nếu để chung ở dạng đậm đặc. Vì vậy luôn pha A trước, khuấy đều rồi mới pha B.

## Trình tự pha chuẩn
- Đổ nước sạch vào bồn khoảng 70% thể tích cần dùng.
- Cho dung dịch A, khuấy đều và chờ dung dịch trong trở lại.
- Cho dung dịch B, khuấy đều.
- Châm nước tới mức quy định rồi đo lại EC và pH.

## Nồng độ EC tham khảo
- Rau ăn lá non: EC 1,2–1,8 mS/cm.
- Rau ăn lá trưởng thành: EC 1,8–2,2 mS/cm.
- Cà chua, ớt, dưa leo: EC 2,0–2,8 mS/cm.
- pH luôn giữ trong khoảng 5,5–6,5.

## Dấu hiệu cần điều chỉnh
- Lá non vàng, cây chậm lớn: EC đang thấp, kiểm tra lại liều lượng.
- Chóp lá cháy khô: EC quá cao, thay bớt 20–30% nước trong bồn.
- Rêu xanh trong bồn: bồn bị lọt sáng, cần che kín nắp.

## Vệ sinh định kỳ
- Thay 20–30% nước mỗi 2 tuần, thay toàn bộ mỗi 4–6 tuần.
- Súc bồn và đường ống mỗi 2 tháng để tránh cặn làm tắc béc phun.`,
  },
];

/**
 * Seed bài viết mẫu nếu bảng content_pages đang trống.
 *
 * @returns {number} số bài đã thêm (0 nếu đã có dữ liệu)
 */
async function seedPages() {
  const count = await db.get("SELECT COUNT(*) as cnt FROM content_pages");
  if (Number(count && count.cnt) > 0) {
    console.log("✅ Database already has content pages. Skipping seed.");
    return 0;
  }

  await client.batch(
    PAGES.map((p) => ({
      sql: `INSERT INTO content_pages (slug, title, summary, category, body, related_product, sort_order, published)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [
        p.slug,
        p.title,
        p.summary,
        p.category,
        p.body,
        p.related_product || "",
        p.sort_order || 0,
      ],
    })),
    "write"
  );

  console.log("✅ Seeded", PAGES.length, "content pages successfully.");
  return PAGES.length;
}

// Chạy trực tiếp: `node seed.js` hoặc `npm run seed`
if (require.main === module) {
  (async () => {
    await initDb();
    await seedProducts();
    await seedPages();
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Seed thất bại:", err.message);
    process.exit(1);
  });
}

module.exports = { seedProducts, seedPages, PRODUCTS, PAGES };
