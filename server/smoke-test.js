#!/usr/bin/env node
/**
 * Smoke test cho VƯỜN PHỐ — kiểm tra toàn bộ luồng cốt lõi trước buổi demo.
 *
 * Cách chạy:
 *   node smoke-test.js                       # mặc định http://localhost:3000
 *   node smoke-test.js https://your-domain    # kiểm tra bản đã deploy
 *
 * Dùng luôn để làm minh chứng "đã chạy thử toàn bộ kịch bản" cho Outcome 1.
 */

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");

let passed = 0;
let failed = 0;

function ok(name, detail = "") {
  passed++;
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  failed++;
  console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function check(name, fn) {
  try {
    const detail = await fn();
    ok(name, detail);
  } catch (err) {
    fail(name, err.message);
  }
}

async function api(path, { method = "GET", body, token } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 120) };
  }
  return { status: res.status, json };
}

async function main() {
  console.log(`\n🌿 VƯỜN PHỐ — Smoke test @ ${BASE}\n`);
  const stamp = Date.now();
  const email = `smoke.${stamp}@vuonpho.test`;
  let customerToken = "";
  let adminToken = "";

  console.log("── 1. Hạ tầng & dữ liệu công khai ──");
  await check("GET /api/health", async () => {
    const { status, json } = await api("/api/health");
    if (status !== 200 || json.status !== "ok") throw new Error(`status=${status}`);
    return json.status;
  });

  await check("GET /api/products (>=3 gói)", async () => {
    const { status, json } = await api("/api/products");
    if (status !== 200) throw new Error(`status=${status}`);
    if (!Array.isArray(json.data) || json.data.length < 3) throw new Error("thiếu sản phẩm");
    return `${json.data.length} gói`;
  });

  await check("GET /api/recommend", async () => {
    const { status, json } = await api("/api/recommend?house_type=chungcu&area=small&budget=low");
    if (status !== 200 || !json.data) throw new Error(`status=${status}`);
    return `gợi ý: ${json.data.name}`;
  });

  console.log("\n── 2. Luồng khách hàng (OC1: giảng viên tự đăng ký dùng được) ──");
  await check("POST /api/customers/register", async () => {
    const { status, json } = await api("/api/customers/register", {
      method: "POST",
      body: {
        name: "Smoke Test",
        phone: "0900000000",
        email,
        password: "matkhau123",
        house_type: "chungcu",
        area: "small",
        budget: "low",
        goal: "kiểm thử",
        source: "smoke_test",
      },
    });
    if (status !== 201) throw new Error(`status=${status} ${JSON.stringify(json)}`);
    customerToken = json.data.token;
    return `id=${json.data.user.id}`;
  });

  await check("POST /api/customers/login", async () => {
    const { status, json } = await api("/api/customers/login", {
      method: "POST",
      body: { email, password: "matkhau123" },
    });
    if (status !== 200) throw new Error(`status=${status}`);
    customerToken = json.data.token;
    return "có token";
  });

  await check("GET /api/customers/me (có token)", async () => {
    const { status, json } = await api("/api/customers/me", { token: customerToken });
    if (status !== 200 || json.data.email !== email) throw new Error(`status=${status}`);
    return json.data.email;
  });

  await check("GET /api/customers/me chặn khi thiếu token", async () => {
    const { status } = await api("/api/customers/me");
    if (status !== 401) throw new Error(`mong đợi 401, nhận ${status}`);
    return "401 đúng";
  });

  await check("POST /api/customers/me/requests", async () => {
    const { status, json } = await api("/api/customers/me/requests", {
      method: "POST",
      token: customerToken,
      body: {
        house_type: "chungcu",
        area: "small",
        budget: "low",
        goal: "Có rau sạch cho gia đình",
        note: "Smoke test request",
        purchase_type: "Thuê 1 tháng",
        product_interest: "Mini Kit",
        source: "smoke_test",
      },
    });
    if (status !== 201) throw new Error(`status=${status} ${JSON.stringify(json)}`);
    return `request id=${json.data.id}`;
  });

  await check("GET /api/customers/me/requests", async () => {
    const { status, json } = await api("/api/customers/me/requests", { token: customerToken });
    if (status !== 200 || json.data.length < 1) throw new Error(`status=${status}`);
    return `${json.data.length} yêu cầu`;
  });

  console.log("\n── 3. Đo lường (OC2: visit / đăng ký / yêu cầu) ──");
  await check("POST /api/track (page_view có UTM)", async () => {
    const { status } = await api("/api/track", {
      method: "POST",
      body: {
        type: "page_view",
        path: "/index.html",
        visitor_id: `smoke-${stamp}`,
        source: "tiktok",
        medium: "social",
        campaign: "smoke_test",
      },
    });
    if (status !== 201) throw new Error(`status=${status}`);
    return "đã ghi nhận";
  });

  console.log("\n── 4. Quản trị (admin) ──");
  await check("POST /api/auth/login (admin)", async () => {
    const { status, json } = await api("/api/auth/login", {
      method: "POST",
      body: { username: "admin", password: "admin123" },
    });
    if (status !== 200) throw new Error(`status=${status} — đổi mật khẩu admin rồi thì sửa lại biến này`);
    adminToken = json.data.token;
    return "có token admin";
  });

  await check("GET /api/stats (dashboard)", async () => {
    const { status, json } = await api("/api/stats", { token: adminToken });
    if (status !== 200) throw new Error(`status=${status}`);
    return `${json.totalContacts} yêu cầu`;
  });

  await check("GET /api/stats/funnel", async () => {
    const { status, json } = await api("/api/stats/funnel", { token: adminToken });
    if (status !== 200) throw new Error(`status=${status}`);
    return `visits=${json.visits} · đăng ký=${json.registrations} · yêu cầu=${json.requests}`;
  });

  await check("GET /api/contacts (danh sách khách)", async () => {
    const { status, json } = await api("/api/contacts", { token: adminToken });
    if (status !== 200) throw new Error(`status=${status}`);
    return `${json.pagination.total} bản ghi`;
  });

  console.log(`\n${"─".repeat(52)}`);
  console.log(`  KẾT QUẢ: ${passed} đạt · ${failed} lỗi`);
  console.log(`${"─".repeat(52)}\n`);

  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n💥 Smoke test dừng đột ngột:", err.message);
  process.exit(1);
});
