/**
 * Kiểm tra xem server production có đang dùng JWT_SECRET mặc định trong code hay không.
 *
 * Cách hoạt động: ký một token admin bằng chuỗi mặc định đã công khai trong repo rồi
 * gọi một endpoint yêu cầu quyền admin.
 *   - Nếu server CHẤP NHẬN  -> đang dùng secret mặc định => LỖ HỔNG, phải đặt JWT_SECRET.
 *   - Nếu server TỪ CHỐI 401 -> đã có JWT_SECRET riêng => an toàn.
 *
 * Dùng: node check-secret.js [url]
 * File này chỉ DÙNG ĐỂ KIỂM TRA, không ảnh hưởng dữ liệu.
 */
const jwt = require("jsonwebtoken");

const DEV_SECRET = "vuonpho_dev_secret_thay_khi_deploy";
const target = process.argv[2] || "https://vuonpho.onrender.com";

(async () => {
  console.log("\n🔐 VƯỜN PHỐ — kiểm tra JWT_SECRET trên production");
  console.log("   Server: " + target + "\n");

  const forged = jwt.sign(
    { id: 999, username: "ke_tan_cong", role: "admin" },
    DEV_SECRET,
    { expiresIn: "5m" }
  );

  let res;
  try {
    res = await fetch(target + "/api/stats", {
      headers: { Authorization: "Bearer " + forged },
    });
  } catch (e) {
    console.error("❌ Không kết nối được tới server:", e.message);
    process.exit(1);
  }

  if (res.status === 200) {
    console.log("   ⚠️  KẾT QUẢ: token giả đã được CHẤP NHẬN (HTTP 200)");
    console.log("   ➜ Server đang dùng JWT_SECRET mặc định trong code.");
    console.log("   ➜ BẤT KỲ AI đọc repo công khai cũng tạo được token quản trị.");
    console.log("   ➜ PHẢI đặt biến môi trường JWT_SECRET trên Render ngay.\n");
    process.exit(2);
  }

  if (res.status === 401) {
    console.log("   ✅ KẾT QUẢ: token giả bị TỪ CHỐI (HTTP 401)");
    console.log("   ➜ Server đã có JWT_SECRET riêng. Không cần làm gì thêm.\n");
    process.exit(0);
  }

  console.log("   ❓ Phản hồi bất thường: HTTP " + res.status);
  console.log("   " + (await res.text()).slice(0, 200) + "\n");
  process.exit(1);
})();
