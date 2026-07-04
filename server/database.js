const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "aerogreen.db");

let db;

function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema();
  }
  return db;
}

function initSchema() {
  db.exec(`
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
  `);

  // Migration: add email column to existing databases
  try {
    db.exec("ALTER TABLE contacts ADD COLUMN email TEXT DEFAULT ''");
  } catch (e) {
    // column already exists — safe to ignore
  }

  // Seed default admin if no users exist
  const userCount = db.prepare("SELECT COUNT(*) as cnt FROM users").get();
  if (userCount.cnt === 0) {
    const bcrypt = require("bcryptjs");
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    db.prepare("INSERT INTO users (username, password, displayName, role) VALUES (?, ?, ?, ?)").run(
      "admin",
      hashedPassword,
      "Quản trị viên",
      "admin"
    );
    console.log("👤 Default admin created: admin / admin123");
  }
}

module.exports = { getDatabase };
