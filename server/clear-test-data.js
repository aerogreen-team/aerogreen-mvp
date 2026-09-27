#!/usr/bin/env node
/**
 * Xoá dữ liệu do smoke test tạo ra, để số liệu OC2 không bị lẫn dữ liệu giả.
 *
 *   node clear-test-data.js
 *
 * Chỉ xoá các bản ghi nhận diện được là của smoke test:
 *   - customers / contacts có email kết thúc bằng @vuonpho.test
 *   - events có nguồn (source) = smoke_test
 *   - events có visitor_id bắt đầu bằng "smoke-"
 *   - events gắn với tài khoản khách đã bị xoá (mồ côi)
 * KHÔNG đụng tới dữ liệu thật của khách hàng.
 */

const { db, initDb } = require("./database");

const TEST_EMAIL = "%@vuonpho.test";
const TEST_SOURCE = "smoke_test";
const TEST_VISITOR = "smoke-%";

async function main() {
  await initDb();

  const contacts = await db.run("DELETE FROM contacts WHERE email LIKE ?", [TEST_EMAIL]);
  const customers = await db.run("DELETE FROM customers WHERE email LIKE ?", [TEST_EMAIL]);
  const eventsBySource = await db.run("DELETE FROM events WHERE source = ?", [TEST_SOURCE]);
  const eventsByVisitor = await db.run("DELETE FROM events WHERE visitor_id LIKE ?", [TEST_VISITOR]);
  const eventsOrphan = await db.run(
    "DELETE FROM events WHERE customer_id IS NOT NULL AND customer_id NOT IN (SELECT id FROM customers)"
  );

  const events = eventsBySource.changes + eventsByVisitor.changes + eventsOrphan.changes;

  console.log("\n🧹 Đã xoá dữ liệu smoke test:");
  console.log("   Yêu cầu tư vấn :", contacts.changes);
  console.log("   Tài khoản khách:", customers.changes);
  console.log("   Sự kiện        :", events);
  console.log("");

  const left = await db.get("SELECT COUNT(*) as cnt FROM contacts");
  const leftCustomers = await db.get("SELECT COUNT(*) as cnt FROM customers");
  const leftEvents = await db.get("SELECT COUNT(*) as cnt FROM events");
  console.log(
    "   Còn lại — yêu cầu:",
    left.cnt,
    "· tài khoản khách:",
    leftCustomers.cnt,
    "· sự kiện:",
    leftEvents.cnt,
    "\n"
  );
}

main().catch((err) => {
  console.error("\n   LỖI:", err.message, "\n");
  process.exit(1);
});
