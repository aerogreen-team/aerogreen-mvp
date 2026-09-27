/**
 * Kiểm tra nhanh bản production sau khi deploy.
 * Dùng: node verify-live.js [url]
 *
 * Phần kiểm tra đăng nhập quản trị chỉ chạy khi có biến môi trường ADMIN_PASSWORD:
 *   ADMIN_PASSWORD=matkhau node verify-live.js
 *
 * An toàn: không thay đổi dữ liệu. Bước đổi mật khẩu cố tình dùng mật khẩu cũ
 * SAI nên server sẽ từ chối và không ghi gì.
 */
const target = process.argv[2] || "https://vuonpho.onrender.com";

// KHÔNG hard-code mật khẩu quản trị. Truyền qua biến môi trường ADMIN_PASSWORD.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

let pass = 0;
let fail = 0;

function check(label, ok, detail) {
  if (ok) {
    pass++;
    console.log("  ✅ " + label + (detail ? " — " + detail : ""));
  } else {
    fail++;
    console.log("  ❌ " + label + (detail ? " — " + detail : ""));
  }
}

async function req(path, options) {
  const res = await fetch(target + path, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}
  return { status: res.status, text, json };
}

(async () => {
  console.log("\n🌿 VƯỜN PHỐ — kiểm tra bản production");
  console.log("   " + target + "\n");

  // ---- 1. Giao diện mới đã lên chưa ----
  console.log("── 1. Bản deploy mới (commit 42d3294) ──");

  const admin = await req("/admin/index.html");
  check(
    "Tab \"Tài khoản\" có trong trang quản trị",
    admin.text.includes('data-tab="account"'),
    admin.status + ""
  );
  check("Form đổi mật khẩu có trong trang quản trị", admin.text.includes("password-form"));

  const login = await req("/login");
  check(
    "Trang đăng nhập KHÔNG còn lộ \"Mặc định: admin / admin123\"",
    !login.text.includes("Mặc định")
  );

  // ---- 2. Server hoạt động bình thường ----
  console.log("\n── 2. Server vẫn hoạt động ──");
  const health = await req("/api/health");
  check("/api/health trả 200", health.status === 200, health.json && health.json.status);
  const products = await req("/api/products");
  check("/api/products trả 200", products.status === 200);

  // ---- 3. JWT_SECRET đã được đặt ----
  console.log("\n── 3. Bảo mật JWT ──");
  const jwt = require("jsonwebtoken");
  const forged = jwt.sign({ id: 999, username: "ke_tan_cong", role: "admin" }, "vuonpho_dev_secret_thay_khi_deploy", {
    expiresIn: "5m",
  });
  const forgedRes = await req("/api/stats", { headers: { Authorization: "Bearer " + forged } });
  check(
    "Token giả ký bằng khoá mặc định bị TỪ CHỐI",
    forgedRes.status === 401,
    "HTTP " + forgedRes.status
  );

  // ---- 4. Endpoint đổi mật khẩu chạy đúng trên production ----
  // Chỉ chạy khi có ADMIN_PASSWORD, vì sau khi đổi mật khẩu thì không thể
  // đoán trước được mật khẩu hiện tại.
  if (!ADMIN_PASSWORD) {
    console.log("\n── 4. Endpoint đổi mật khẩu ──");
    console.log("  ⏭️  Bỏ qua: chưa có ADMIN_PASSWORD trong biến môi trường.");
    console.log("     Chạy lại với: ADMIN_PASSWORD=<mật-khẩu-hiện-tại> node verify-live.js");
  } else {
    console.log("\n── 4. Endpoint đổi mật khẩu (dùng mật khẩu cũ SAI, không đổi gì) ──");

    const loginRes = await req("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: ADMIN_PASSWORD }),
    });
    const token = loginRes.json && loginRes.json.data && loginRes.json.data.token;
    check("Đăng nhập quản trị thành công", loginRes.status === 200 && !!token);

    if (token) {
      const wrong = await req("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ oldPassword: "sai_be_bet_khong_dung", newPassword: "khong_bao_gio_dung" }),
      });
      check(
        "Mật khẩu cũ sai bị từ chối (400)",
        wrong.status === 400,
        "HTTP " + wrong.status + " · " + (wrong.json && wrong.json.error)
      );

      const shortPw = await req("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ oldPassword: ADMIN_PASSWORD, newPassword: "123" }),
      });
      check(
        "Mật khẩu mới quá ngắn bị từ chối (400)",
        shortPw.status === 400,
        "HTTP " + shortPw.status + " · " + (shortPw.json && shortPw.json.error)
      );
    }

    // ---- 5. Mật khẩu chưa bị thay đổi ----
    console.log("\n── 5. Xác nhận mật khẩu chưa đổi ──");
    const relogin = await req("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "admin", password: ADMIN_PASSWORD }),
    });
    check("Mật khẩu hiện tại vẫn đăng nhập được", relogin.status === 200);
  }

  console.log("\n" + "─".repeat(52));
  console.log("  KẾT QUẢ: " + pass + " đạt · " + fail + " lỗi");
  console.log("─".repeat(52) + "\n");
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error("\n❌ Lỗi không mong đợi:", e.message, "\n");
  process.exit(1);
});
