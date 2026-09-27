const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");

// Nạp server/.env nếu có (Node >= 20.12 có sẵn process.loadEnvFile — không cần dotenv).
// Phải chạy TRƯỚC khi đọc process.env bên dưới.
try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(path.join(__dirname, ".env"));
  }
} catch (e) {
  // chưa có .env — chạy bằng biến môi trường hoặc chế độ local file
}

/**
 * Một code path duy nhất cho cả local và production:
 *   - Production — Turso: TURSO_DATABASE_URL=libsql://<db>.turso.io + TURSO_AUTH_TOKEN
 *   - Local/dev  — không cần cấu hình gì: tự dùng file aerogreen.db (libSQL hỗ trợ "file:")
 *   - Override   — DB_PATH=/data/aerogreen.db (khi tự host kèm volume)
 */
function resolveDbUrl() {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  const localPath = process.env.DB_PATH || path.join(__dirname, "aerogreen.db");
  return "file:" + localPath.replace(/\\/g, "/");
}

const DB_URL = resolveDbUrl();

// Nếu dùng file local thì đảm bảo thư mục cha tồn tại
if (DB_URL.startsWith("file:")) {
  try {
    fs.mkdirSync(path.dirname(DB_URL.slice(5)), { recursive: true });
  } catch (e) {
    // thư mục đã có, hoặc không tạo được — lỗi sẽ hiện rõ khi truy vấn
  }
}

const client = createClient({
  url: DB_URL,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

/* ================= Lớp truy cập dữ liệu bất đồng bộ =================
   better-sqlite3 là đồng bộ; @libsql/client là bất đồng bộ, nên mọi truy vấn
   đều phải `await`. Lớp mỏng này giữ cách gọi ngắn gọn: db.get / db.all / db.run / db.exec
*/

/** libSQL trả Row dạng lai (vừa theo index vừa theo tên cột) — chuyển về object thuần */
function toObject(rs, row) {
  const out = {};
  for (let i = 0; i < rs.columns.length; i++) out[rs.columns[i]] = row[i];
  return out;
}

async function get(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rs.rows.length ? toObject(rs, rs.rows[0]) : undefined;
}

async function all(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rs.rows.map((row) => toObject(rs, row));
}

async function run(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return {
    lastInsertRowid: rs.lastInsertRowid == null ? null : Number(rs.lastInsertRowid),
    changes: rs.rowsAffected,
  };
}

async function exec(sql) {
  await client.executeMultiple(sql);
}

const db = { get, all, run, exec, client };

/** Giữ API cũ để các route không phải đổi cách require */
function getDatabase() {
  return db;
}

async function doInit() {
  await exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT DEFAULT '',
      house_type TEXT DEFAULT '',
      area TEXT DEFAULT '',
      budget TEXT DEFAULT '',
      goal TEXT DEFAULT '',
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','contacted','installed','closed')),
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      holes INTEGER DEFAULT 0,
      suitable_for TEXT DEFAULT '',
      size TEXT DEFAULT '',
      price INTEGER DEFAULT 0,
      price_label TEXT DEFAULT '',
      image TEXT DEFAULT '',
      features TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    CREATE TABLE IF NOT EXISTS quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requestId TEXT NOT NULL UNIQUE,
      contactId INTEGER NOT NULL,
      equipmentPrice INTEGER DEFAULT 0,
      installPrice INTEGER DEFAULT 0,
      nutrientPrice INTEGER DEFAULT 0,
      totalAmount INTEGER DEFAULT 0,
      depositPercent REAL DEFAULT 10,
      depositAmount INTEGER DEFAULT 0,
      remainingAmount INTEGER DEFAULT 0,
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','deposit_paid','confirmed','completed','cancelled')),
      created_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      updated_at DATETIME DEFAULT (datetime('now', '+7 hours')),
      FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      displayName TEXT DEFAULT '',
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin','staff')),
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Khách hàng tự đăng ký (yêu cầu OC1: giảng viên tự đăng ký và dùng được)
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      house_type TEXT DEFAULT '',
      area TEXT DEFAULT '',
      budget TEXT DEFAULT '',
      goal TEXT DEFAULT '',
      source TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    -- Số liệu đo lường cho Outcome 2 (visits / đăng ký / yêu cầu / đơn)
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      path TEXT DEFAULT '',
      label TEXT DEFAULT '',
      visitor_id TEXT DEFAULT '',
      customer_id INTEGER DEFAULT NULL,
      source TEXT DEFAULT '',
      medium TEXT DEFAULT '',
      campaign TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', '+7 hours'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at);
  `);

  // Migration: add email column to existing databases
  for (const stmt of [
    "ALTER TABLE contacts ADD COLUMN email TEXT DEFAULT ''",
    "ALTER TABLE contacts ADD COLUMN customer_id INTEGER DEFAULT NULL",
    "ALTER TABLE contacts ADD COLUMN source TEXT DEFAULT ''",
  ]) {
    try {
      await exec(stmt);
    } catch (e) {
      // cột đã tồn tại — bỏ qua
    }
  }

  // Seed tài khoản quản trị mặc định nếu chưa có user nào
  const userCount = await get("SELECT COUNT(*) as cnt FROM users");
  if (Number(userCount && userCount.cnt) === 0) {
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    await run("INSERT INTO users (username, password, displayName, role) VALUES (?, ?, ?, ?)", [
      "admin",
      hashedPassword,
      "Quản trị viên",
      "admin",
    ]);
    console.log("👤 Default admin created: admin / admin123");
  }
}

/** Khởi tạo bảng + migration + seed admin. Idempotent, an toàn khi gọi nhiều lần. */
let readyPromise = null;
function initDb() {
  if (!readyPromise) {
    readyPromise = doInit().catch((err) => {
      readyPromise = null; // cho phép thử lại lần sau
      throw err;
    });
  }
  return readyPromise;
}

module.exports = { getDatabase, initDb, db, client, DB_URL };
