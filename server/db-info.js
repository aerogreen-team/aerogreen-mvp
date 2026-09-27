#!/usr/bin/env node
/**
 * Xem nhanh dữ liệu đang có trong database (local file hoặc Turso).
 *
 *   node db-info.js
 *
 * Hữu ích để kiểm tra: đã kết nối đúng database chưa, bảng nào đã tạo,
 * sản phẩm/tài khoản/yêu cầu đang có bao nhiêu bản ghi.
 */

const { db, initDb, DB_URL } = require("./database");

function targetLabel() {
  if (DB_URL.startsWith("file:")) return "file (local) — " + DB_URL.slice(5);
  try {
    // Không in token, chỉ in host
    return "Turso (remote) — " + new URL(DB_URL).host;
  } catch {
    return "remote";
  }
}

async function main() {
  console.log("\n🌿 VƯỜN PHỐ — kiểm tra database");
  console.log("   Nguồn:", targetLabel());
  console.log("");

  await initDb();

  const tables = await db.all(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  console.log("   Bảng:", tables.map((t) => t.name).join(", ") || "(chưa có)");

  const counts = [
    ["products", "Sản phẩm"],
    ["customers", "Tài khoản khách"],
    ["users", "Tài khoản quản trị"],
    ["contacts", "Yêu cầu tư vấn"],
    ["quotations", "Báo giá"],
    ["events", "Sự kiện đo lường"],
  ];

  console.log("");
  for (const [table, label] of counts) {
    const row = await db.get(`SELECT COUNT(*) as cnt FROM ${table}`);
    console.log(`   ${label.padEnd(20)} ${row.cnt}`);
  }

  const products = await db.all("SELECT name, price_label, holes FROM products ORDER BY price");
  if (products.length) {
    console.log("\n   Gói giải pháp:");
    for (const p of products) {
      console.log(`     - ${p.name} · ${p.holes} lỗ · ${p.price_label}`);
    }
  }

  const admin = await db.get("SELECT username, role FROM users ORDER BY id LIMIT 1");
  if (admin) console.log(`\n   Quản trị: ${admin.username} (${admin.role})`);

  const leads = await db.all(
    "SELECT name, COALESCE(NULLIF(source, ''), 'direct') as source, status FROM contacts ORDER BY id DESC LIMIT 5"
  );
  if (leads.length) {
    console.log("\n   5 yêu cầu mới nhất:");
    for (const l of leads) console.log(`     - ${l.name} · nguồn: ${l.source} · ${l.status}`);
  }

  console.log("\n   Kết nối thành công.\n");
}

main().catch((err) => {
  console.error("\n   LỖI:", err.message, "\n");
  process.exit(1);
});
