# Kế hoạch chuyển VƯỜN PHỐ sang Vercel

> **Trạng thái:** bản kế hoạch — chưa thay đổi một dòng mã nguồn nào.
> **Cơ sở:** nhánh `main` @ `01b3496` (đã pull ngày 14/11/2026), Node 22.15.1, `node --test tests/*.cjs` = **22/22 pass**.
> **Phạm vi:** repo `aerogreen-mvp` (Express + Turso/libSQL), production hiện chạy Render (Singapore).
> **Mục tiêu:** production trên Vercel (Hobby, $0) giữ nguyên website tĩnh, API, trang quản trị, trang hợp đồng và upload ảnh.
> **Ước lượng:** ~13,5 giờ công (≈ 2 ngày), rủi ro trung bình, chạy song song Render được trong suốt quá trình.
> **Đã áp dụng ngày 14/11/2026:** P1–P4 (tái cấu trúc `public/`, `app.js`, Vercel Blob, `vercel.json`) trên nhánh `feat/vercel` — xem mục 12. Còn lại P5–P7 (tạo project Vercel, Preview, cutover).

---

## 1. Tóm tắt

Chuyển sang Vercel không phải "đổi chỗ deploy" mà là **đổi mô hình chạy**: từ một process Node sống lâu (có ổ đĩa, có `express.static`) sang **một Vercel Function duy nhất** (chỉ đọc `public/**`, không ghi ổ đĩa, mỗi request có thể rơi vào instance khác).

Ba việc lớn quyết định thành công:

| # | Việc | Vì sao bắt buộc |
|---|---|---|
| 1 | Đưa toàn bộ tài nguyên tĩnh (`*.html`, `css/`, `js/`, `fonts/`, `images/`, `server/admin/`) vào `public/` | `express.static()` bị Vercel bỏ qua; chỉ `public/**` được CDN phục vụ ([docs](https://vercel.com/docs/frameworks/backend/express#serving-static-assets)) |
| 2 | Tách app Express khỏi `app.listen` → `app.js` ở gốc repo, `module.exports = app` | Vercel nhận diện Express qua `app.js` / `index.js` / `server.js` ở gốc hoặc `src/`; `server/server.js` hiện tại **không** được nhận diện |
| 3 | Bỏ mọi phụ thuộc ổ đĩa: DB phải là Turso, ảnh phải lên object storage | Ổ đĩa function là read-only/tạm; `fs.mkdirSync` lúc `require()` sẽ làm function crash ngay |

**Khác biệt lớn so với bản kế hoạch trước:** `main` **chưa có** lớp lưu trữ ảnh R2 — code R2 chỉ tồn tại trên nhánh `feature/backend-modular-monolith` (commit `e276043`). Vì vậy "đưa ảnh ra khỏi ổ đĩa" là **việc mới**, không phải chỉnh sửa nhỏ (xem P3).

---

## 2. Hiện trạng `main` và khoảng cách tới Vercel

### 2.1 Cấu trúc hiện tại (đã kiểm chứng)

```
aerogreen-mvp/
├─ *.html (11)            index, about, products, services, materials, contact,
│                         account, register, noi-dung, contract, login  (khách hàng)
├─ css/ (9)               style.css, materials.css, product-cards.css, ...
├─ js/ (15)               script.js, auth.js, api-loader.js, package-catalog.js, ...
├─ fonts/ (4)             be-vietnam-pro-*.woff2, OFL.txt
├─ images/ (36 + uploads/.gitkeep)   ảnh trang chủ, favicon, zalo...
├─ public/images/         installations/, materials/lifetech-ap3100/  (đã có sẵn)
├─ server/                server.js, database.js, seed.js, routes/(10), middleware/(2), admin/(4)
├─ tests/ (4 file, 22 test)
├─ render.yaml            Render Blueprint (rootDir: server)
├─ .github/workflows/deploy-render.yml
└─ package.json           deps root (9 gói) + server/package.json (6 gói)
```

- `api/` tồn tại nhưng **rỗng** (thư mục sót lại, git không track) → xoá.
- **Không** có `vercel.json`, `.vercelignore`, `Dockerfile`, `docker-compose.yml`, `Caddyfile` trên `main` (các file đó thuộc nhánh VPS đã bỏ).
- Front-end dùng **hai quy ước đường dẫn ảnh**: `images/...` (favicon, ảnh trang chủ) và `public/images/...`
  (57 chỗ trong `index.html`, `products.html`, `js/installations-data.js`, `js/materials-data.js`, `js/package-catalog.js`…).
  Vì `public/` trở thành web root nên quy ước thứ hai phải được xử lý — xem V1.10.
- Upload ảnh hiện tại: `multer.diskStorage` → `images/uploads/`, giới hạn 5 MB, chặn SVG. Thư mục này **đang rỗng** (chỉ `.gitkeep`) và **không** ảnh nào trong DB trỏ vào đó → không cần migrate dữ liệu ảnh cũ.

### 2.2 Bảng chênh lệch

| Hạng mục | Hiện tại (`main`) | Trên Vercel | Việc |
|---|---|---|---|
| Entry point | `server/server.js` gọi `app.listen()` | `app.js` ở gốc, `module.exports = app` | V2.1–V2.2 |
| Tài nguyên tĩnh | `express.static(path.join(__dirname, ".."))` phục vụ cả repo | Chỉ `public/**`; `express.static` bị bỏ qua | P1 |
| Trang quản trị | `express.static(server/admin)` + route `/admin*` | `public/admin/**` do CDN phục vụ | V1.4, V4.5 |
| `/login` (admin) vs `/login.html` (khách) | `res.sendFile(server/admin/login.html)` | Rewrite `/login` → `/admin/login.html`, giữ `cleanUrls: false` | V4.1 |
| `/hop-dong` | `res.sendFile(contract.html)` | Rewrite → `/contract.html` | V4.1 |
| Dependencies | 2 `package.json`; root có `mysql2`, `nodemailer`, `dotenv` **không dùng** | Vercel chỉ đọc `package.json` gốc | V4.3 |
| Cơ sở dữ liệu | Turso (production) hoặc file `server/aerogreen.db` (local) | Bắt buộc Turso | V2.4 |
| Upload ảnh | Ghi đĩa `images/uploads/` (5 MB) | Cần object storage; body tối đa **4,5 MB**/request | P3 |
| Vòng đời process | Sống lâu, seed 1 lần khi khởi động | Cold start liên tục | V2.3 |
| Region | Singapore | Mặc định `iad1` (Mỹ); đặt `hnd1` (Tokyo) gần Turso | V4.1 |
| Biến môi trường | `server/.env` + dashboard Render | Environment Variables (Production/Preview/Development) | V4.4 |
| CI/CD | GitHub Action gọi Render Deploy Hook | Git integration của Vercel | V7.1 |
| Test | 4 file, chạy `node --test tests/*.cjs`, đọc file bằng đường dẫn tương đối từ gốc repo | File nằm trong `public/` | V1.5–V1.6 |
| Mã dùng chung | `js/package-catalog.js` vừa nạp ở browser vừa `require()` từ `server/seed.js`, `server/routes/products.js`, `server/routes/recommend.js` | Phải nằm trong `public/` **và** vẫn `require()` được | V1.5 |

---

## 3. Kiến trúc đích

```
aerogreen-mvp/
├─ app.js                     ← MỚI: Express app (không listen), module.exports = app
├─ package.json               ← gộp deps + engines.node 22.x
├─ vercel.json                ← MỚI: region hnd1 + rewrites
├─ .vercelignore              ← MỚI
├─ public/                    ← TOÀN BỘ nội dung công khai (CDN)
│  ├─ index.html, about.html, products.html, services.html, materials.html,
│  │  contact.html, account.html, register.html, noi-dung.html, contract.html,
│  │  login.html              ← đăng nhập KHÁCH HÀNG
│  ├─ admin/                  ← chuyển từ server/admin/ (index.html, login.html, script.js, style.css)
│  ├─ css/  js/  fonts/  images/   ← images gồm cả uploads/ (chỉ còn .gitkeep)
├─ server/                    ← chỉ code chạy trong function
│  ├─ server.js               ← dev bootstrap: require("../app") + listen
│  ├─ database.js  seed.js  routes/  middleware/  lib/(mới: storage)
└─ tests/  docs/
```

Luồng request:

```
GET /                     → CDN: public/index.html
GET /css/style.css        → CDN: public/css/style.css
GET /admin                → CDN: public/admin/index.html
GET /login                → rewrite → public/admin/login.html  (đăng nhập admin)
GET /login.html           → CDN: public/login.html             (đăng nhập khách)
GET /hop-dong?code=...    → rewrite → public/contract.html
GET /api/products         → Vercel Function (app.js) → Turso
POST /api/uploads         → Vercel Function → object storage → trả URL công khai
```

---

## 4. Kế hoạch công việc

Cột **☐** để tick khi xong. Mã việc dùng tham chiếu ở bảng rủi ro.

### P0 — Chuẩn bị (45 phút)

| ID | Việc | Lệnh / file | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V0.1 | Tạo project Vercel, nối GitHub repo, **chưa** deploy | Vercel Dashboard → Add New → Project | Project tồn tại, thấy repo | 15' | ☐ |
| V0.2 | Sao lưu trước khi đổi cấu trúc | `git tag pre-vercel`; `turso db shell vuonpho ".dump" > backup.sql` | Có tag + file dump mở được | 20' | ☐ |
| V0.3 | Thu thập biến môi trường đang dùng trên Render | Render → Environment (copy giá trị, **không** ghi vào repo) | Có `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET` | 10' | ☐ |
| V0.4 | Baseline local | `cd server; npm install; npm run dev` và `node --test tests/*.cjs` | Server chạy, **22/22 test xanh** (đã xác nhận 14/11) | 15' | ☐ |

> Lưu ý: `node --test tests/` **không chạy** trên Node 22.15 (báo `MODULE_NOT_FOUND`). Luôn dùng glob `node --test tests/*.cjs` và chạy từ **gốc repo** (test đọc file bằng đường dẫn tương đối).

### P1 — Tái cấu trúc tài nguyên tĩnh vào `public/` (2 giờ)

| ID | Việc | Lệnh / file | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V1.1 | Di chuyển 11 tệp HTML ở gốc | `git mv *.html public/` | `public/index.html` tồn tại, gốc không còn `*.html` | 10' | ☐ |
| V1.2 | Gộp CSS/fonts/ảnh vào `public/` (giữ nguyên cấu trúc con) | `git mv css fonts public/`; `git mv images/* public/images/` | `public/css/style.css`, `public/fonts/*`, `public/images/uploads/.gitkeep`; không còn `css/ fonts/ images/` ở gốc | 20' | ☐ |
| V1.3 | Di chuyển `js/` (gồm `package-catalog.js`) | `git mv js public/js` | `public/js/script.js` tồn tại | 5' | ☐ |
| V1.4 | Di chuyển trang quản trị | `git mv server/admin public/admin` | `public/admin/index.html`, `public/admin/login.html` | 10' | ☐ |
| V1.5 | Sửa 4 chỗ `require()` trỏ tới `js/package-catalog` | `server/seed.js`, `server/routes/products.js`, `server/routes/recommend.js`, `tests/package-pricing.test.cjs` → `../public/js/package-catalog` (đường dẫn tương ứng) | `node -e "require('./server/seed')"` không lỗi module; test xanh | 15' | ☐ |
| V1.6 | Cập nhật đường dẫn đọc file trong test | `tests/*.cjs`: `path.join(root, "public", file)` / `read("public/css/style.css")`; `materials.test.cjs` đọc `public/js/...`, `public/css/materials.css` | `node --test tests/*.cjs` = 22/22 | 30' | ☐ |
| V1.7 | Cho server dev phục vụ `public/` | `server/server.js`: `express.static(path.join(__dirname, "..", "public"))`, admin → `public/admin`, `/login` → `public/admin/login.html`, `/hop-dong` → `public/contract.html` | `npm run dev` mở được 11 trang + `/admin` + `/login` + `/hop-dong?code=AGH001` | 20' | ☐ |
| V1.8 | Rà link tuyệt đối bị lệch | `rg '(href|src)="/' public` | Chỉ còn `contract.html` → `/` và `login.html` → `/login` (đều hợp lệ) | 15' | ☐ |
| V1.9 | Dọn thư mục rỗng `api/` | `Remove-Item api` | Không còn `api/` | 5' | ☑ |
| V1.10 | Giữ tương thích đường dẫn cũ `public/images/...` (57 chỗ trong mã + `cover_image` đã lưu trong Turso) | `vercel.json`: rewrite `/public/:path*` → `/:path*`; dev: `app.use("/public", express.static(PUBLIC_DIR))` | Ảnh mở được ở cả `/images/...` và `/public/images/...` | 15' | ☑ |

> CSS dùng `url("../fonts/be-vietnam-pro-400.woff2")` nên **phải** giữ `css/` và `fonts/` là hai thư mục anh em trong `public/`. Mọi asset trong HTML đều là đường dẫn tương đối → chỉ cần di chuyển nguyên cây, không phải viết lại link.

### P2 — Refactor Express cho serverless (2,5 giờ)

| ID | Việc | File | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V2.1 | Tạo `app.js` ở gốc: `require("express")` trực tiếp, `cors`, `express.json({ limit: "1mb" })`, `app.set("trust proxy", 1)`, gắn toàn bộ routes, `module.exports = app`, **không** `listen`, **không** `express.static`/`sendFile` | `app.js` (mới) | `require("./app")` trả về app; Vercel nhận diện framework `express` | 60' | ☐ |
| V2.2 | `server/server.js` thành bootstrap dev: `require("../app")`, `app.listen`, in banner, cảnh báo thiếu `JWT_SECRET` | `server/server.js` | `npm run dev` vẫn chạy như trước | 25' | ☐ |
| V2.3 | `initDb()` → middleware `ensureDb` memoized; bỏ seed khỏi cold start, seed bằng `npm run seed` | `app.js`, `server/seed.js` | Request đầu tự tạo bảng; seed thủ công chạy đúng | 60' | ☐ |
| V2.4 | `database.js`: fail-fast khi `process.env.VERCEL` mà thiếu `TURSO_DATABASE_URL`; không `mkdirSync` khi serverless | `server/database.js` | Log lỗi rõ, không âm thầm dùng file DB | 30' | ☐ |
| V2.5 | Chạy lại smoke local sau refactor | `node server/smoke-test.js http://localhost:3000` | **14/14 xanh** | 20' | ☐ |

### P3 — Lưu trữ ảnh (1,5 giờ) — **đã chốt: Vercel Blob**

`main` chỉ ghi ổ đĩa nên đây là hạng mục mới. Quyết định ngày 14/11/2026: dùng **Vercel Blob**, viết qua lớp `server/lib/storage.js` để có thể đổi sang R2 sau này mà không sửa route.

| ID | Việc | File | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V3.1 | Tạo Blob store trong project Vercel; lấy `BLOB_READ_WRITE_TOKEN` | Vercel → Storage → Blob | Token có trong Environment Variables (cả 3 môi trường) | 10' | ☐ |
| V3.2 | Viết driver: `saveImage(buffer, filename, contentType) → { url }` dùng `put()` với `access: "public"` | `server/lib/storage.js` | Script nhỏ upload được file, URL mở được | 40' | ☐ |
| V3.3 | `uploads.js`: `fs.mkdirSync` **chỉ khi không serverless**; dùng `multer.memoryStorage()`; giảm `MAX_SIZE_MB` 5 → 4; thiếu token → 503 JSON | `server/routes/uploads.js` | Import module không crash khi `VERCEL=1`; ảnh 3,9 MB OK, 4,2 MB trả 400 JSON | 40' | ☐ |
| V3.4 | Cập nhật biến môi trường mẫu | `server/.env.example` | Có khối `BLOB_READ_WRITE_TOKEN` kèm ghi chú chỉ cần thiết trên production | 10' | ☐ |
| V3.5 | Thêm dependency vào `package.json` gốc | `@vercel/blob` | `npm install` sạch từ lockfile | 10' | ☐ |

> **Phương án dự phòng (B — Cloudflare R2):** nếu sau này rời Vercel, chỉ cần thay `server/lib/storage.js` bằng `server/lib/r2.js` lấy từ commit `e276043` (đọc `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `R2_UPLOAD_PREFIX`) và thêm `@aws-sdk/client-s3`; route upload giữ nguyên vì cùng interface. Lưu ý `uploads.js` của commit đó **chưa** guard `fs.mkdirSync`, vẫn phải sửa như V3.3. Chi phí free tier R2: 10 GB, egress miễn phí — nhưng cần bucket + public domain + 5 biến môi trường.

### P4 — Cấu hình Vercel (1 giờ)

| ID | Việc | File | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V4.1 | `vercel.json`: `regions: ["hnd1"]` + rewrites `/login`, `/admin`, `/hop-dong`; **không** khai báo khối `functions` (zero-config Express không dùng tên function `app.js`) | `vercel.json` | `npx vercel build` không báo key lạ | 20' | ☐ |
| V4.2 | `.vercelignore` | `.vercelignore` | `server/node_modules`, `*.db`, `.env*`, `tests`, `docs`, `render.yaml` không bị upload | 10' | ☐ |
| V4.3 | `package.json` gốc: thêm `engines.node "22.x"`, gom scripts (`dev`, `start`, `seed`, `smoke`, `test`, `db:info`), bỏ `mysql2`, `nodemailer`, `dotenv` (không file nào require) | `package.json` | `npm install` gốc cài đủ; `node -e "require('express')"` OK | 20' | ☐ |
| V4.4 | Nhập biến môi trường cho cả 3 môi trường | Vercel → Settings → Environment Variables | Bảng mục 5 điền đủ | 15' | ☐ |
| V4.5 | Chạy `npx vercel dev` (CLI ≥ 47.0.5) | — | Toàn bộ trang + API hoạt động như `npm run dev` | 45' | ☐ |

> `cleanUrls` giữ **false** (mặc định). Nếu bật, `/login.html` sẽ 308 sang `/login` và đụng rewrite trang admin → mất một trong hai trang đăng nhập.
> Kiểm tra riêng `/admin`: nếu trả 404 thay vì `index.html`, giữ rewrite `/admin` → `/admin/index.html` (đã có trong mẫu V4.1).

### P5 — Preview & kiểm thử (2,5 giờ)

| ID | Việc | Lệnh | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V5.1 | Push nhánh `feat/vercel` → Preview Deployment | `git push -u origin feat/vercel` | Có URL preview, build xanh | 10' | ☐ |
| V5.2 | Smoke trên preview | `node server/smoke-test.js https://<preview>` | 14/14 xanh | 15' | ☐ |
| V5.3 | Kiểm thử thủ công luồng quản trị | Trình duyệt | Đăng nhập `/login`, xem dashboard, tạo bài viết, upload ảnh → URL storage | 30' | ☐ |
| V5.4 | Kiểm thử trang hợp đồng công khai | `/hop-dong?code=AGH001` | Render đúng, in được, không 404 | 10' | ☐ |
| V5.5 | Đo cold start & độ trễ API | Runtime Logs | Healthcheck sau 5' idle < 3 s; API thường < 800 ms | 20' | ☐ |
| V5.6 | Kiểm tra static: cache, MIME, 404, không lộ source | `curl -I https://<preview>/css/style.css`; `curl -I .../server/database.js` | CSS có cache CDN; `server/*` trả 404 | 15' | ☐ |
| V5.7 | Kiểm tra giới hạn upload | 3,9 MB / 4,2 MB / 4,6 MB | 3,9 MB OK; 4,2 MB lỗi JSON; 4,6 MB bị nền tảng chặn 413 — không treo | 10' | ☐ |
| V5.8 | Sửa lỗi phát sinh, lặp lại V5.1–V5.7 | — | Không còn lỗi P0/P1 | 90' | ☐ |

### P6 — Cutover production (1 giờ)

| ID | Việc | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|
| V6.1 | Merge vào `main` → Production Deployment | Deploy production xanh | 10' | ☐ |
| V6.2 | Gắn domain (nếu có) + DNS | Domain trả HTTPS 200, chứng chỉ tự cấp | 30' | ☐ |
| V6.3 | Smoke trên domain thật | 14/14 xanh | 10' | ☐ |
| V6.4 | Giữ Render chạy song song 1–2 tuần làm fallback | Service vẫn tồn tại, không deploy mới | 5' | ☐ |
| V6.5 | Theo dõi Runtime Logs 48 giờ đầu | Không có 500 lặp lại | 20' | ☐ |

### P7 — Dọn dẹp & tài liệu (1,5 giờ)

| ID | Việc | File | Điều kiện hoàn thành | Ước lượng | ☐ |
|---|---|---|---|---|---|
| V7.1 | Ngừng workflow deploy Render (đổi trigger sang `workflow_dispatch`) hoặc xoá | `.github/workflows/deploy-render.yml` | Push `main` không còn gọi Render | 5' | ☐ |
| V7.2 | Viết lại mục deploy trong README sang Vercel | `README.md` | Người mới đọc README deploy được chỉ bằng tài liệu | 45' | ☐ |
| V7.3 | Quyết định giữ/xoá `render.yaml` (chỉ còn giá trị làm fallback) | `render.yaml` | Có ghi chú lý do trong README | 10' | ☐ |
| V7.4 | Rà secret từng bị commit | `git log --all -- .env '*.db'` | Không có secret trong lịch sử, hoặc đã xoay token | 20' | ☐ |
| V7.5 | Cập nhật `server/TODO.md` / tài liệu bàn giao | `server/TODO.md` | Không còn việc "deploy Render" treo | 10' | ☐ |

---

## 5. Biến môi trường trên Vercel

| Biến | Bắt buộc | Giá trị / ghi chú | Production | Preview |
|---|---|---|---|---|
| `TURSO_DATABASE_URL` | ✅ | `libsql://vuonpho-....turso.io` | DB thật | DB riêng cho preview |
| `TURSO_AUTH_TOKEN` | ✅ | Token Turso (bí mật) | ✅ | ✅ |
| `JWT_SECRET` | ✅ | Hex 48 byte, **khác** bản Render: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` | ✅ | ✅ (khác production) |
| `BLOB_READ_WRITE_TOKEN` | ✅ | Vercel tự sinh khi tạo Blob store (Storage → Blob) | ✅ | ✅ |
| `R2_*` (`ACCOUNT_ID`, `ACCESS_KEY_ID`, `SECRET_ACCESS_KEY`, `BUCKET`, `PUBLIC_BASE_URL`) | ❌ | Chỉ dùng nếu chuyển sang phương án B dự phòng | — | — |
| `NODE_ENV` | ⬜ | `production` | ✅ | ✅ |
| `UPLOAD_DIR`, `UPLOAD_PUBLIC_PREFIX` | ❌ | Không dùng trên Vercel (đã ép object storage) | — | — |

> `JWT_SECRET` mới làm mọi token quản trị cũ hết hiệu lực — dự kiến trước, không phải lỗi.
> `server/.env` **không** được upload (nằm trong `.vercelignore`); code đọc file này trong `try/catch` nên không lỗi trên Vercel.

---

## 6. Cấu hình mẫu

`vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "regions": ["hnd1"],
  "rewrites": [
    { "source": "/login", "destination": "/admin/login.html" },
    { "source": "/admin", "destination": "/admin/index.html" },
    { "source": "/hop-dong", "destination": "/contract.html" },
    { "source": "/public/:path*", "destination": "/:path*" }
  ]
}
```

> Rewrite cuối giữ cho các đường dẫn cũ `public/images/...` còn nằm trong mã front-end và trong
> `cover_image` đã lưu ở Turso — nếu bỏ, khoảng 57 ảnh sẽ 404.

`.vercelignore`:

```
server/node_modules
**/*.db
**/*.db-shm
**/*.db-wal
.env
.env.*
server/.env
tests
docs
render.yaml
```

`package.json` gốc (phần thay đổi):

```json
{
  "engines": { "node": "22.x" },
  "scripts": {
    "dev": "node server/server.js",
    "start": "node server/server.js",
    "seed": "node server/seed.js",
    "smoke": "node server/smoke-test.js",
    "db:info": "node server/db-info.js",
    "test": "node --test tests/*.cjs"
  }
}
```

> **Phương án dự phòng:** nếu Vercel không nhận diện `app.js` (preview 404 toàn site), tạo `api/index.js` với `module.exports = require("../app")` và thêm rewrite `{ "source": "/(.*)", "destination": "/api/index" }`. Khi đó mọi request đi qua function, CDN không phục vụ static nữa → chỉ dùng tạm.

---

## 7. Rủi ro & cách giảm thiểu

| Rủi ro | Khả năng | Ảnh hưởng | Cách giảm thiểu | Việc |
|---|---|---|---|---|
| `fs.mkdirSync` trong `uploads.js` chạy lúc import → crash toàn site | Cao (chắc chắn nếu bỏ qua) | Toàn bộ function 500 | Guard `if (!process.env.VERCEL)` + storage driver | V3.3 |
| `js/package-catalog.js` bị move mà quên sửa `require()` | Cao | `seed`, `/api/products`, `/api/recommend` chết | V1.5 là điều kiện tiên quyết của V1.6/V2.5 | V1.5 |
| Ảnh > 4,5 MB bị nền tảng chặn (413) | Cao | Admin không upload được ảnh lớn | Giới hạn 4 MB + thông báo rõ; về sau dùng presigned/direct upload | V3.3, V5.7 |
| Quên di chuyển file tĩnh → 404 toàn site | Trung bình | Không demo được | Làm P1 trước P5, kiểm tra đủ 11 trang | V1.1–V1.9 |
| Đường dẫn cũ `public/images/...` bị 404 sau khi `public/` thành web root | Cao (nếu bỏ rewrite) | ~57 ảnh hỏng | Rewrite `/public/:path*` + mount tương thích khi dev | V1.10 |
| `/login` (admin) đụng `/login.html` (khách) | Trung bình | Không vào được trang quản trị | Giữ `cleanUrls: false`, test cả hai URL | V4.1, V5.3 |
| `/admin` trả 404 thay vì `index.html` | Thấp | Không vào được dashboard | Rewrite `/admin` → `/admin/index.html` | V4.5 |
| Test đọc file sai thư mục sau khi move | Cao nếu bỏ qua | CI/local test đỏ, mất lưới an toàn | Sửa cả 4 file test, chạy lại 22/22 | V1.6 |
| Preview deployment ghi vào Turso thật | Trung bình | Dữ liệu khách bị trộn | DB riêng cho Preview | V4.4 |
| Cold start chậm do seed/`initDb` mỗi instance | Trung bình | Request đầu 5–10 s | Seed bằng script, `initDb` memoized | V2.3 |
| `@libsql/client` native binding trên Lambda | Thấp | API 500 khi khởi tạo client | Build trên Linux của Vercel tự lấy binary đúng; nếu lỗi dùng `@libsql/client/web` + URL `https://` | V5.5 |
| Ảnh đã upload trên Render nằm ở `images/uploads` (đĩa tạm) | Thấp | Mất ảnh cũ | Đã kiểm tra: thư mục rỗng, DB không tham chiếu | — |
| Vercel Hobby chỉ cho mục đích phi thương mại | Trung bình (dài hạn) | Phải nâng Pro ($20/người/tháng) | Dùng Hobby cho đồ án; thương mại hoá thì dự trù Pro | V7.3 |
| Phụ thuộc một người quản lý Vercel | Trung bình | Mất quyền deploy | Thêm 2 owner vào team Vercel | V0.1 |

---

## 8. Checklist nghiệm thu (Definition of Done)

- [ ] 11 trang mở đúng, không 404 ảnh/CSS/JS: `/`, `/about.html`, `/products.html`, `/services.html`, `/materials.html`, `/contact.html`, `/account.html`, `/register.html`, `/noi-dung.html`, `/contract.html`, `/login.html`
- [ ] `/admin` mở dashboard; `/login` là trang admin; `/login.html` là trang khách
- [ ] `node server/smoke-test.js https://<domain>` đạt 14/14
- [ ] `node --test tests/*.cjs` đạt 22/22 trên máy local
- [ ] Upload ảnh trả URL của object storage, ảnh mở được công khai
- [ ] `/hop-dong?code=AGH001` render đúng, nút in hoạt động
- [ ] Dữ liệu khách trên Turso còn nguyên (đếm `contacts`, `customers` trước/sau khớp)
- [ ] `/css/style.css` có cache CDN; `/server/database.js` trả 404
- [ ] Không còn đọc biến từ `server/.env` trên Vercel
- [ ] Runtime Logs 48 h không có 500 lặp lại
- [ ] README hướng dẫn deploy Vercel đầy đủ

---

## 9. Rollback

| Bước | Hành động | Thời gian |
|---|---|---|
| 1 | Vercel → Deployments → bản trước → **Instant Rollback** | < 1 phút |
| 2 | Lỗi do hạ tầng (DB/storage): trỏ DNS về Render (bản Render vẫn chạy) | 5–30 phút (tùy TTL) |
| 3 | Lỗi do code: `git revert` trên `main` → Vercel tự deploy lại | 3–5 phút |
| 4 | Khôi phục dữ liệu: `turso db shell vuonpho < backup.sql` | 5 phút |

Điều kiện rollback: API lỗi > 5% request trong 15 phút, hoặc không đăng nhập được admin, hoặc mất dữ liệu khách.

---

## 10. Tiến độ đề xuất

| Buổi | Nội dung | Kết quả |
|---|---|---|
| Ngày 1 sáng | P0 + P1 | Repo tái cấu trúc, 22/22 test xanh, chạy local ổn |
| Ngày 1 chiều | P2 + P3 | `app.js` chạy được, upload lên storage |
| Ngày 1 tối | P4 + V5.1 | `vercel dev` đúng, có URL Preview |
| Ngày 2 sáng | V5.2–V5.8 | Preview đạt DoD, smoke 14/14 |
| Ngày 2 chiều | P6 + P7 | Domain production chạy, tài liệu cập nhật |

---

## 11. Quyết định cần chốt trước khi bắt đầu

1. ~~**Lưu trữ ảnh: Vercel Blob (A) hay Cloudflare R2 (B)?**~~ → **đã chốt A (Vercel Blob)**, 14/11/2026; R2 giữ làm phương án dự phòng sau interface `server/lib/storage.js`.
2. **Dùng lại Turso `vuonpho` cho production hay tạo DB mới?** — đề xuất dùng lại cho production, tạo DB mới cho Preview.
3. **Giữ Render song song bao lâu?** — đề xuất 2 tuần.
4. **Domain riêng hay dùng `*.vercel.app`?** — ảnh hưởng V6.2.
5. **Ai là owner thứ hai của Vercel team?**
6. **Có cần upload ảnh > 4 MB?** — nếu có, phải làm upload trực tiếp từ trình duyệt lên storage (presigned/direct), ngoài phạm vi kế hoạch này.

---

## 12. Trạng thái thực hiện (14/11/2026)

Nhánh `feat/vercel`, dựa trên `main` @ `01b3496`. Chưa deploy, chưa cutover.

| Nhóm | Đã làm | Kiểm chứng |
|---|---|---|
| P1 | Toàn bộ 11 HTML + `css/`, `fonts/`, `js/`, `images/`, `server/admin` → `public/`; xoá `api/` rỗng | `git mv`, 11 trang + asset trả 200 khi chạy local |
| P1 | Sửa 3 chỗ `require()` trỏ `../public/js/package-catalog` + 4 file test đọc `public/…` | `npm test` → **22/22** |
| P1 | Rewrite tương thích `public/images/...` | `/public/images/installations/optimized/ban-cong-05.jpg` → 200 |
| P2 | `app.js` ở gốc (export app, `trust proxy`, `json` 1 MB, `ensureDb` memoized, error handler JSON) | `require('./app')` OK; server chạy |
| P2 | `server/server.js` thành bootstrap dev: static `public/`, `/public` tương thích, `/login`, `/hop-dong`, uploads, seed khi khởi động | `/`, `/admin/`, `/login`, `/hop-dong?code=AGH001` → 200 |
| P2 | `database.js`: fail-fast khi `VERCEL` thiếu `TURSO_DATABASE_URL`; không `mkdirSync` khi serverless | — |
| P3 | `server/lib/storage.js` (Vercel Blob) + `uploads.js`: memoryStorage khi có storage, 503 nếu serverless thiếu token, 5 MB → **4 MB** | `require` với `VERCEL=1` không crash; `/api/uploads` → 401 |
| P4 | `vercel.json` (hnd1 + 4 rewrite), `.vercelignore`, `.gitignore` thêm `.vercel` | — |
| P4 | `public/admin/index.html` dùng đường dẫn tuyệt đối `/admin/style.css`, `/admin/script.js` để `/admin` (không có dấu `/` cuối, đã rewrite) vẫn tải đúng asset | `/admin/`, `/admin/style.css`, `/admin/script.js` → 200 |
| P4 | `package.json` gốc: `engines.node 22.x`, scripts `dev/start/seed/smoke/test/db:info/db:clean/reset-password`, bỏ `mysql2`/`nodemailer`/`dotenv`, thêm `@vercel/blob` | `npm install` + `npm test` xanh |
| P4 | `render.yaml` đổi sang cài ở gốc + `node server/server.js` (giữ Render dự phòng hoạt động) | — |
| P7 (một phần) | README: kiến trúc, cấu trúc thư mục, chạy local (`npm install` ở gốc), bảng biến môi trường, mục deploy Vercel, xử lý sự cố | — |

**Thay đổi hành vi cần biết**

- Cài dependency ở **gốc repo** (`npm install`), không còn `cd server && npm install` — vì `app.js` nằm ở gốc.
- `server/package.json` vẫn giữ để Render build theo `rootDir` cũ nếu cần; dependency thật sự dùng khi chạy từ gốc là `package.json` gốc.
- Upload ảnh trên Vercel cần `BLOB_READ_WRITE_TOKEN`; thiếu token → 503 kèm thông báo, không ghi đĩa.
- Thiếu `TURSO_DATABASE_URL` khi `VERCEL=1` → lỗi rõ ràng ngay khi function khởi động (không tạo DB file rỗng).

**Việc còn lại (cần tài khoản Vercel):** P5.1 (tạo project + Blob store trên dashboard), P5.2–P5.8 (Preview + smoke + đo cold start), P6 (cutover, domain), P7 phần còn lại (tắt workflow Render sau khi ổn định).

### 12.1 Phát hiện khi deploy thật (14/11/2026)

Đã tạo trên Vercel: project `nam-ee25/aerogreen-mvp`, Blob store `vuonpho-uploads` (public, `hnd1`), biến môi trường `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` / `JWT_SECRET` / `BLOB_READ_WRITE_TOKEN` cho Production + Preview.

Ba điều chỉ có thể biết sau khi deploy — đã sửa vào mã:

| Hiện tượng | Nguyên nhân | Cách xử lý đã áp dụng |
|---|---|---|
| `Cannot find module 'express'` ở lần deploy đầu | Project đặt **Root Directory = `server`** (theo README cũ) nên Vercel build trong `server/`, không thấy `app.js` ở gốc | Xoá Root Directory (`rootDirectory = ""`), framework preset `Express` |
| `/` trả `Cannot GET /` dù `/about.html` chạy | Function được mount tại `/`: request `/` luôn vào function trước khi tới rewrite; rewrite `source: "/"` không có tác dụng | `app.js` đọc sẵn `public/index.html` khi `VERCEL=1` và trả về ở route `/`; file được bundler đóng gói kèm function |
| Rewrite `/(.*)` → `/index.html` làm `/api/*` trả HTML | Rewrite của người dùng chạy **trước** route function | Bỏ catch-all rewrite, chỉ giữ rewrite cho `/login`, `/admin`, `/hop-dong`, `/public/*` |

> Đã thử chuyển sang mô hình "static + `api/` function" bằng `outputDirectory: "public"`: Vercel báo `No entrypoint found in output directory` → không dùng. Giữ mô hình zero-config Express (framework preset `Express`).
