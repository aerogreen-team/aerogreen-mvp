/**
 * Đổi mật khẩu tài khoản quản trị.
 *
 * Dùng:
 *   node admin-set-password.js <mật-khẩu-mới> [url]
 *
 * Ví dụ:
 *   node admin-set-password.js MatKhauMoi2026
 *   node admin-set-password.js MatKhauMoi2026 https://vuonpho.onrender.com
 *
 * Mặc định trỏ vào server production. Thêm "local" để đổi trên máy:
 *   node admin-set-password.js MatKhauMoi2026 local
 *
 * LƯU Ý: mật khẩu sẽ nằm trong lịch sử dòng lệnh của bạn.
 *        Sau khi chạy xong nên xoá lịch sử hoặc dùng dấu cách đầu dòng.
 */
const OLD_PASSWORD = "admin123";
const USERNAME = "admin";

const newPassword = process.argv[2];
const targetArg = process.argv[3];

if (!newPassword) {
  console.error("\n❌ Thiếu mật khẩu mới.");
  console.error("   Dùng: node admin-set-password.js <mật-khẩu-mới> [url|local]\n");
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("\n❌ Mật khẩu mới phải có ít nhất 6 ký tự.\n");
  process.exit(1);
}

if (newPassword === OLD_PASSWORD) {
  console.error("\n❌ Mật khẩu mới trùng mật khẩu cũ.\n");
  process.exit(1);
}

const base =
  !targetArg || targetArg === "prod" || targetArg === "production"
    ? "https://vuonpho.onrender.com"
    : targetArg === "local"
      ? "http://localhost:3000"
      : targetArg;

async function post(path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const res = await fetch(base + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function put(path, body, token) {
  const res = await fetch(base + path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

(async () => {
  console.log("\n🔑 VƯỜN PHỐ — đổi mật khẩu quản trị");
  console.log("   Server : " + base);
  console.log("   Tài khoản: " + USERNAME + "\n");

  // Bước 1: đăng nhập bằng mật khẩu cũ để lấy token
  let login;
  try {
    login = await post("/api/auth/login", {
      username: USERNAME,
      password: OLD_PASSWORD,
    });
  } catch (e) {
    console.error("❌ Không kết nối được tới server:", e.message + "\n");
    process.exit(1);
  }

  if (login.status !== 200 || !login.body.data || !login.body.data.token) {
    console.error("❌ Đăng nhập bằng mật khẩu cũ thất bại (HTTP " + login.status + ").");
    console.error("   " + (login.body.error || "Có thể mật khẩu đã được đổi trước đó.") + "\n");
    process.exit(1);
  }
  console.log("   ✅ Đăng nhập bằng mật khẩu cũ — thành công");

  // Bước 2: đổi sang mật khẩu mới
  const changed = await put(
    "/api/auth/change-password",
    { oldPassword: OLD_PASSWORD, newPassword },
    login.body.data.token
  );

  if (changed.status !== 200) {
    console.error("❌ Đổi mật khẩu thất bại (HTTP " + changed.status + ").");
    console.error("   " + (changed.body.error || "") + "\n");
    process.exit(1);
  }
  console.log("   ✅ Đã đổi mật khẩu");

  // Bước 3: xác nhận mật khẩu mới đăng nhập được
  const verify = await post("/api/auth/login", {
    username: USERNAME,
    password: newPassword,
  });

  if (verify.status === 200 && verify.body.data && verify.body.data.token) {
    console.log("   ✅ Đăng nhập bằng mật khẩu mới — thành công");
    console.log("\n   🎉 Xong. Nhớ lưu mật khẩu mới ở nơi an toàn.\n");
    process.exit(0);
  }

  console.error("⚠️  Đã đổi nhưng không đăng nhập lại được bằng mật khẩu mới.");
  console.error("   Kiểm tra lại ngay trước khi thoát!\n");
  process.exit(1);
})();
