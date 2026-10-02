#!/usr/bin/env node
/**
 * ĐẶT LẠI mật khẩu quản trị khi đã QUÊN (không cần mật khẩu cũ).
 *
 * Mật khẩu trong database được lưu dưới dạng hash bcrypt (một chiều) nên
 * KHÔNG thể khôi phục lại mật khẩu cũ — chỉ có thể ghi đè bằng một mật khẩu mới.
 * Script này làm đúng việc đó: ghi hash mới trực tiếp vào database.
 *
 * Dùng:
 *   node admin-reset-password.js                 # hỏi mật khẩu mới (không hiện ký tự)
 *   node admin-reset-password.js <tài-khoản>     # tài khoản khác (mặc định: admin)
 *
 *   node admin-reset-password.js --dry-run       # chỉ kiểm tra, KHÔNG ghi gì
 *   node admin-reset-password.js --force         # cho phép mật khẩu yếu / trùng cũ
 *
 * Chạy không tương tác (script tự động, CI):
 *   printf 'matkhau-moi\n' | node admin-reset-password.js <tài-khoản>
 *   node admin-reset-password.js <tài-khoản> <mật-khẩu-mới>   # lọt vào lịch sử lệnh
 *
 * Script chạy trên ĐÚNG database mà server đang dùng (đọc server/.env):
 *   - Local / Turso — xem dòng "Nguồn:" in ra khi chạy.
 *   - Nếu .env trỏ vào Turso của production thì đặt lại ở đây sẽ có hiệu lực
 *     cho CẢ bản đã deploy lẫn máy local, vì hai bên dùng chung một database.
 *
 * Nhập mật khẩu ở dạng tương tác để mật khẩu KHÔNG lọt vào lịch sử dòng lệnh.
 * (Chỉ truyền mật khẩu qua tham số khi thật cần chạy tự động, ví dụ trong CI.)
 */
const bcrypt = require("bcryptjs");
const { initDb, db, DB_URL } = require("./database");

const MIN_LENGTH = 6;
const DEFAULT_USERNAME = "admin";

// Có terminal thật hay không (pipe / chuyển tiếp thì không hỏi lại được)
const isInteractive = Boolean(process.stdin.isTTY);

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith("--")));
const positional = argv.filter((a) => !a.startsWith("--"));

const username = positional[0] || DEFAULT_USERNAME;
const passwordArg = positional[1]; // tuỳ chọn — xem cảnh báo ở trên
const dryRun = flags.has("--dry-run");
const force = flags.has("--force");

function targetLabel() {
  if (DB_URL.startsWith("file:")) return "file (local) — " + DB_URL.slice(5);
  try {
    return "database từ xa — " + new URL(DB_URL).host; // không in token
  } catch {
    return "database từ xa";
  }
}

/**
 * Đọc một dòng từ stdin khi không phải terminal (ví dụ: cat pw.txt | node ...).
 * CHỈ đọc được MỘT lần — pipe kết thúc một lần nên kết quả được cache lại;
 * nhờ vậy lần "nhập lại" không treo vô hạn. Dùng: printf 'matkhau\n' | node ...
 */
let stdinLine = null;
function readFirstLineFromStdin() {
  if (!stdinLine) {
    stdinLine = new Promise((resolve) => {
      let buf = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        buf += chunk;
      });
      process.stdin.on("end", () => resolve(buf.split(/\r?\n/)[0]));
      process.stdin.resume();
    });
  }
  return stdinLine;
}

/** Hỏi mật khẩu mà không hiện ký tự nào (raw mode → terminal không echo) */
function askHidden(label) {
  if (!isInteractive) return readFirstLineFromStdin();

  return new Promise((resolve) => {
    process.stderr.write(label);
    const stdin = process.stdin;
    stdin.resume();
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);

    let buf = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          process.stderr.write("\n");
          return resolve(buf);
        }
        if (ch === "\u0003") {
          // Ctrl-C
          cleanup();
          process.stderr.write("\n");
          process.exitCode = 130;
          resolve(null);
          return;
        }
        if (ch === "\u007f" || ch === "\b") {
          buf = buf.slice(0, -1);
          continue;
        }
        if (ch === "\u001b") continue; // bỏ qua phím mũi tên
        buf += ch;
      }
    };

    stdin.on("data", onData);
  });
}

async function main() {
  console.log("\n🌿 VƯỜN PHỐ — đặt lại mật khẩu quản trị");
  console.log("   Nguồn    : " + targetLabel());
  console.log("   Tài khoản: " + username + (dryRun ? "   [DRY RUN — không ghi]" : "") + "\n");

  await initDb(); // tạo bảng nếu chưa có; tạo admin/admin123 nếu chưa có user nào

  const user = await db.get("SELECT id, username, password, role FROM users WHERE username = ?", [
    username.trim(),
  ]);

  if (!user) {
    const existing = await db.all("SELECT username FROM users ORDER BY id");
    console.error("❌ Không tìm thấy tài khoản " + JSON.stringify(username) + ".");
    if (existing.length) {
      console.error("   Tài khoản đang có: " + existing.map((u) => u.username).join(", "));
    } else {
      console.error("   Database chưa có tài khoản nào.");
    }
    console.error("");
    process.exitCode = 1;
    return;
  }

  // ---- Lấy mật khẩu mới ----
  let newPassword = passwordArg;
  if (!newPassword) {
    newPassword = await askHidden("   Mật khẩu mới (ít nhất " + MIN_LENGTH + " ký tự): ");
    if (newPassword === null) return; // Ctrl-C

    if (isInteractive) {
      const again = await askHidden("   Nhập lại mật khẩu mới              : ");
      if (again === null) return;
      if (newPassword !== again) {
        console.error("\n❌ Hai lần nhập không khớp. Không có gì thay đổi.\n");
        process.exitCode = 1;
        return;
      }
    } else {
      // Che ký tự từ pipe được coi là đã xác nhận (chỉ đọc được 1 dòng)
      process.stderr.write("   (nhận mật khẩu từ stdin — bỏ qua bước nhập lại)\n");
    }
  }

  if (!newPassword || newPassword.length < MIN_LENGTH) {
    console.error("\n❌ Mật khẩu mới phải có ít nhất " + MIN_LENGTH + " ký tự.\n");
    process.exitCode = 1;
    return;
  }

  if (bcrypt.compareSync(newPassword, user.password)) {
    console.error("\n❌ Mật khẩu mới TRÙNG mật khẩu đang dùng. Không có gì thay đổi.\n");
    process.exitCode = 1;
    return;
  }

  if (newPassword === "admin123" && !force) {
    console.error("\n❌ Không cho phép đặt lại về mật khẩu mặc định đã công khai (admin123).");
    console.error("   Dùng thêm --force nếu bạn thật sự muốn.\n");
    process.exitCode = 1;
    return;
  }

  const hash = bcrypt.hashSync(newPassword, 10);
  if (!bcrypt.compareSync(newPassword, hash)) {
    console.error("\n❌ Hash vừa tạo không hợp lệ (lỗi bcrypt). Không có gì thay đổi.\n");
    process.exitCode = 1;
    return;
  }

  if (dryRun) {
    console.log("   ℹ️  DRY RUN: đã tạo hash hợp lệ, nhưng KHÔNG ghi vào database.");
    console.log("   ➜ Chạy lại không có --dry-run để đặt lại thật.\n");
    return;
  }

  // ---- Ghi hash mới ----
  const res = await db.run("UPDATE users SET password = ? WHERE id = ?", [hash, user.id]);
  if (!Number(res.changes)) {
    console.error("\n❌ Không ghi được (0 dòng bị ảnh hưởng).\n");
    process.exitCode = 1;
    return;
  }

  // ---- Xác nhận lại bằng chính dữ liệu vừa ghi ----
  const check = await db.get("SELECT password FROM users WHERE id = ?", [user.id]);
  const ok = !!check && bcrypt.compareSync(newPassword, check.password);

  if (!ok) {
    console.error("⚠️  Đã ghi nhưng xác nhận lại THẤT BẠI. Kiểm tra ngay!\n");
    process.exitCode = 1;
    return;
  }

  console.log("   ✅ Đã đặt lại mật khẩu cho tài khoản " + user.username + " (role: " + user.role + ").");
  console.log("   ✅ Đã xác nhận lại: đăng nhập được bằng mật khẩu mới.");
  console.log("\n   ➜ Đăng nhập tại /login (bản deploy và máy local dùng chung database này).");
  console.log("   ➜ Lưu mật khẩu mới ở nơi an toàn.\n");
}

main().catch((err) => {
  console.error("\n❌ LỖI:", err.message, "\n");
  process.exitCode = 1;
});
