# 🌿 VƯỜN PHỐ

> **Giải pháp khí canh toàn diện: Tư vấn — So sánh — Lắp đặt — Bảo trì**
> Nền tảng giúp hộ gia đình tại TP.HCM chọn đúng hệ thống khí canh phù hợp với diện tích và ngân sách của mình.

**Học phần:** EXE201 — Khởi nghiệp 2 · Nhóm dự án 221 · GVHD: ThS. Lê Hồng Hạnh

---

## 🔗 Liên kết

| | |
|---|---|
| **Website (đang chạy)** | **https://vuonpho.onrender.com** *(bản Vercel: đang triển khai — xem [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md))* |
| **Trang quản trị** | `https://vuonpho.onrender.com/login` — tài khoản `admin` *(mật khẩu mặc định `admin123` đã được đổi; quên thì chạy `npm run reset-password`)* |
| **Database** | Turso `vuonpho` — region `aws-ap-northeast-1` (Tokyo) |
| **Tên miền riêng** | *(cập nhật sau khi gắn tên miền .me từ GitHub Student Pack)* |
| **Tài liệu** | `EXE201/User_Manual_VuonPho.md` · `EXE201/User_Manual_Video_Script_NAM.md` · `../OC1_OC2_Readiness_Plan.md` |

---

## 🧱 Kiến trúc

```
Người dùng ──► Vercel: CDN phục vụ public/**  +  1 Express Function cho /api/*
                     │
                     ├── Trang tĩnh: public/index, about, services, products, contact…
                     ├── Thư viện bài viết:  /noi-dung.html
                     ├── Trang tài khoản: register / login / account
                     ├── Trang quản trị:  /login → public/admin, API qua Function
                     └── REST API:        /api/*
                                  │
                                  ├── Turso (libSQL) — toàn bộ dữ liệu
                                  └── Vercel Blob — ảnh admin upload
```

| Thành phần | Công nghệ | Chi phí |
|---|---|---|
| Frontend | HTML + CSS + JS thuần (không framework) | $0 |
| Backend | Node.js 22 · Express 4 (một Vercel Function) | $0 |
| Database | **Turso** (libSQL, tương thích cú pháp SQLite) | $0 |
| Hosting | **Vercel** (Hobby) — Render giữ làm bản dự phòng | $0 |
| Lưu ảnh | **Vercel Blob** (1 GB free) | $0 |

**Vì sao tách database ra khỏi máy chủ?** Free tier của các nền tảng hosting dùng ổ đĩa tạm thời
(ephemeral) — file SQLite sẽ mất mỗi lần deploy hoặc restart. Turso lưu dữ liệu ở nơi khác nên
dữ liệu khách hàng tồn tại lâu dài, còn server có thể deploy lại thoải mái.

---

## 📁 Cấu trúc thư mục

```
aerogreen-mvp/
├── app.js                # Express app — entry point Vercel (export app, không listen)
├── vercel.json           # Region hnd1 + rewrite /login, /admin, /hop-dong
├── public/               # Toàn bộ tài nguyên công khai (CDN phục vụ)
│   ├── index.html        # Trang chủ
│   ├── about.html        # Giới thiệu
│   ├── services.html     # 4 dịch vụ
│   ├── products.html     # 3 gói giải pháp + trợ lý chọn gói
│   ├── contact.html      # Form liên hệ (khách chưa đăng nhập)
│   ├── register.html     # Đăng ký tài khoản khách
│   ├── login.html        # Đăng nhập KHÁCH HÀNG
│   ├── account.html      # Hồ sơ + gửi & theo dõi yêu cầu tư vấn
│   ├── contract.html     # Trang hợp đồng dịch vụ (mở bằng link chia sẻ)
│   ├── noi-dung.html     # Thư viện bài viết + chi tiết bài viết
│   ├── admin/            # Dashboard quản trị + login.html của admin (/login)
│   ├── css/  fonts/  images/
│   └── js/               # script.js, auth.js, articles-data.js…
│                         # package-catalog.js dùng chung: browser nạp, server require()
├── server/
│   ├── server.js         # Bootstrap chạy dài hạn: static + /login + /hop-dong + listen
│   ├── database.js       # Kết nối Turso/libSQL + lớp truy cập dữ liệu
│   ├── seed.js           # Dữ liệu mẫu (3 gói giải pháp + bài viết mẫu)
│   ├── lib/storage.js    # Lưu ảnh lên Vercel Blob (đổi sang R2/S3 chỉ sửa file này)
│   ├── smoke-test.js     # 14 kiểm tra tự động
│   ├── db-info.js        # Xem đang kết nối DB nào, có bao nhiêu bản ghi
│   ├── clear-test-data.js# Xoá dữ liệu smoke test
│   ├── .env.example      # Mẫu biến môi trường
│   ├── middleware/       # auth (admin) · customer-auth (khách)
│   └── routes/           # auth · customers · contacts · products · pages
│                         # uploads · recommend · quotations · stats · track
├── tests/                # 22 unit test (npm test)
└── docs/                 # Kế hoạch deploy Vercel, ghi chú nâng cấp giao diện
```

---

## 🚀 Chạy local

**Không cần cấu hình gì.** Nếu không có biến môi trường nào, hệ thống tự dùng file
`server/aerogreen.db` (libSQL hỗ trợ `file:`).

```bash
npm install       # cài ở GỐC repo (app.js nằm ở gốc)
npm run dev       # http://localhost:3000
```

> `server/.env` (nếu có) vẫn được tự nạp — đặt file ở đó như trước.
> Chạy test: `npm test` (22 unit test, không cần server).

| Đường dẫn | Dùng để |
|---|---|
| `http://localhost:3000` | Website |
| `http://localhost:3000/register` | Đăng ký khách hàng (trang tĩnh `register.html`) |
| `http://localhost:3000/login` | **Đăng nhập quản trị** |
| `http://localhost:3000/admin` | Dashboard quản trị |

**Tài khoản quản trị mặc định:** `admin` / `admin123` → **hãy đổi ngay khi deploy thật.**

**Đổi mật khẩu:**

```bash
cd server
node admin-set-password.js <mật-khẩu-mới>       # đổi qua API (cần biết mật khẩu cũ)
node admin-set-password.js <mật-khẩu-mới> local # đổi trên máy, không đụng production
```

**Quên mật khẩu?** Hash bcrypt là một chiều nên **không thể khôi phục** mật khẩu cũ —
chỉ có thể ghi đè bằng mật khẩu mới bằng `admin-reset-password.js` (không cần mật khẩu cũ):

```bash
cd server
node admin-reset-password.js             # hỏi mật khẩu mới, không hiện ký tự
node admin-reset-password.js <tài-khoản> # tài khoản khác (mặc định: admin)
node admin-reset-password.js --dry-run   # chỉ kiểm tra, KHÔNG ghi gì
```

Script ghi trực tiếp vào database mà `server/.env` chỉ tới. Bản deploy trên Render và máy local
**dùng chung một database Turso**, nên đặt lại ở máy là đăng nhập được ngay trên bản deploy —
không cần deploy lại. (Đăng nhập vẫn không cần xoá token cũ: token JWT sống tối đa 24 giờ.)

### Chạy bằng Turso (giống production)

```bash
cd server
cp .env.example .env      # rồi điền TURSO_DATABASE_URL và TURSO_AUTH_TOKEN
cd ..
npm run dev
```

---

## 🔑 Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `TURSO_DATABASE_URL` | Production | `libsql://<db>-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | Production | Token của database (bí mật) |
| `JWT_SECRET` | Production | Chuỗi ngẫu nhiên ≥ 32 byte |
| `BLOB_READ_WRITE_TOKEN` | Production (Vercel) | Token của Blob store — bắt buộc để upload ảnh |
| `PORT` | Không | Mặc định 3000; hosting tự set |
| `DB_PATH` | Không | Chỉ khi tự host kèm volume, thay cho `TURSO_*` |

`server/.env` **đã nằm trong `.gitignore`** — không bao giờ commit file này.

Sinh `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

---

## 🗄️ Tạo database Turso

Turso CLI **yêu cầu WSL trên Windows**, nên cách nhanh nhất là dùng trình duyệt:

1. Vào **https://turso.tech** → đăng nhập bằng GitHub
2. **Create Database** → tên `vuonpho` → chọn region gần nhất (Singapore/Tokyo)
3. Mở database → copy **Database URL** → `TURSO_DATABASE_URL`
4. Tạo **auth token** → `TURSO_AUTH_TOKEN`

Schema và dữ liệu mẫu **tự được tạo khi server khởi động lần đầu**, không cần chạy migration tay.

<details>
<summary>Nếu muốn dùng CLI (trong WSL)</summary>

```bash
wsl
curl -sSfL https://get.tur.so/install.sh | bash
exec $SHELL
turso auth signup
turso db create vuonpho
turso db show vuonpho --url
turso db tokens create vuonpho
```
</details>

---

## ☁️ Deploy lên Vercel

Repo đã cấu hình sẵn cho Vercel: `app.js` (entry Express) + `public/**` (tài nguyên tĩnh) + `vercel.json`.
Chi tiết từng bước, rủi ro và checklist nghiệm thu: [docs/DEPLOY_VERCEL.md](docs/DEPLOY_VERCEL.md).

### Các bước

1. **Tạo Blob store** — Vercel → project → **Storage** → **Blob** → tạo store. Vercel tự sinh `BLOB_READ_WRITE_TOKEN`.
2. **Import repo** — Vercel → **Add New** → **Project** → chọn `aerogreen-team/aerogreen-mvp` (branch `main`).
   Framework để **tự nhận diện** (Express) — không cần build command.
3. **Environment Variables** (Production + Preview):

   ```
   TURSO_DATABASE_URL      = libsql://...
   TURSO_AUTH_TOKEN        = eyJ...
   JWT_SECRET              = <chuỗi ngẫu nhiên>
   BLOB_READ_WRITE_TOKEN   = <do bước 1 sinh ra>
   ```

4. **Deploy** → mở URL `*.vercel.app`, rồi chạy smoke test:

   ```bash
   npm run smoke https://<ten-project>.vercel.app     # 14 kiểm tra trên bản deploy
   ```

### Lưu ý khi chạy trên Vercel

| Điểm | Chi tiết |
|---|---|
| Vùng chạy | `vercel.json` đặt `hnd1` (Tokyo) cho gần Turso `aws-ap-northeast-1` |
| Trang tĩnh | Chỉ `public/**` được CDN phục vụ — `express.static()` bị bỏ qua |
| `/login` vs `/login.html` | `/login` = đăng nhập **quản trị**, `/login.html` = đăng nhập **khách** (rewrite trong `vercel.json`) |
| Upload ảnh | Ảnh đi thẳng lên Vercel Blob; giới hạn **4 MB/ảnh** (Vercel chặn body > 4,5 MB) |
| Trang chủ `/` | Vercel mount Express function tại `/` nên `/` do function trả `public/index.html` (đọc sẵn lúc khởi động); các trang khác vẫn qua CDN |
| Database | Bắt buộc Turso — thiếu `TURSO_DATABASE_URL` server báo lỗi ngay khi khởi động |
| Preview | Nên tạo Turso riêng cho Preview để không ghi vào dữ liệu thật |

### Render (bản dự phòng, không còn cập nhật)

`render.yaml` vẫn giữ để dựng lại service trong vài phút nếu Vercel gặp sự cố. Blueprint đã đổi sang
cài ở **gốc repo** và chạy `node server/server.js` cho khớp cấu trúc mới (`public/` + `app.js`).

```
Build Command  = npm install
Start Command  = node server/server.js
Health Check   = /api/health
```

⚠️ Trên Render, ảnh upload ghi vào `public/images/uploads` (ổ đĩa tạm) — mất sau mỗi lần deploy.

---

## 🌐 Gắn tên miền

1. Lấy tên miền miễn phí 1 năm qua **GitHub Student Pack** (Namecheap `.me`, hoặc Name.com `.app`/`.dev`, hoặc `.TECH`)
2. Vercel → project → **Settings** → **Domains** → thêm tên miền
3. Tại nhà đăng ký tên miền, thêm bản ghi DNS theo hướng dẫn Vercel (thường là `CNAME` → `cname.vercel-dns.com`)
4. Chờ DNS (~5–30 phút). Vercel tự cấp HTTPS.

---

## 🧰 Lệnh có sẵn

| Lệnh | Tác dụng |
|---|---|
| `npm start` | Chạy server (cổng 3000) |
| `npm run dev` | Chạy kèm tự động nạp lại khi sửa code |
| `npm test` | **22 unit test** (đọc thẳng file trong `public/`, không cần server) |
| `npm run seed` | Nạp dữ liệu mẫu (bỏ qua nếu đã có) |
| `npm run smoke <URL>` | **14 kiểm tra** toàn bộ luồng cốt lõi |
| `npm run db:info` | Xem đang kết nối DB nào, số bản ghi, lead mới nhất |
| `npm run db:clean` | Xoá dữ liệu do smoke test tạo ra |

---

## 🔌 API

Các endpoint công khai:

| Method | Endpoint | Chức năng |
|---|---|---|
| `GET` | `/api/health` | Kiểm tra server sống |
| `GET` | `/api/products` | Danh sách gói giải pháp |
| `GET` | `/api/products/:id` | Chi tiết một gói |
| `GET` | `/api/products/compare/list?ids=1,2` | So sánh nhiều gói |
| `GET` | `/api/recommend?house_type=&area=&budget=` | Gợi ý gói phù hợp |
| `GET` | `/api/pages` | Danh sách bài viết đã xuất bản |
| `GET` | `/api/pages/:slug` | Chi tiết bài viết theo slug |
| `POST` | `/api/contact` | Gửi yêu cầu tư vấn (không cần đăng nhập) |
| `POST` | `/api/track` | Ghi nhận lượt truy cập / sự kiện |
| `POST` | `/api/customers/register` | Đăng ký tài khoản khách |
| `POST` | `/api/customers/login` | Đăng nhập khách |
| `GET` | `/api/quotations/by-request/:requestId` | Báo giá cho trang hợp đồng (công khai) |

Cần đăng nhập **khách** (JWT): `GET/PUT /api/customers/me`, `GET/POST /api/customers/me/requests`

Cần đăng nhập **quản trị** (JWT): `/api/contacts/*`, `/api/stats`, `/api/stats/funnel`, `/api/quotations/*`,
`POST/PUT/DELETE /api/pages/*`, `POST /api/uploads` (field `image`, tối đa 4MB).

### Đo lường cho Outcome 2

`GET /api/stats/funnel` trả về đúng các chỉ số cần báo cáo:

```
visits · uniqueVisitors · registrations · requests · qualified · orders
conversion: { visitToRegister, registerToRequest, requestToOrder }
trafficBySource · leadsBySource · visitsByDay · eventsByType
```

Nguồn kênh được ghi nhận tự động từ tham số UTM trên link:
`https://<ten-mien>.me/?utm_source=tiktok&utm_medium=social&utm_campaign=ra_mat`

---

## 🧭 Xử lý sự cố

| Hiện tượng | Nguyên nhân | Cách xử lý |
|---|---|---|
| Ảnh upload trả 503 | Chưa cấu hình `BLOB_READ_WRITE_TOKEN` trên Vercel | Tạo Blob store (Vercel → Storage → Blob) rồi redeploy |
| Upload ảnh báo 413 | Ảnh lớn hơn giới hạn body 4,5 MB của Vercel | Nén ảnh xuống dưới 4 MB |
| Trang mở được nhưng gửi form báo "Không kết nối được máy chủ" | Backend chưa chạy | Chạy `npm run dev` ở gốc repo |
| `SQLITE_...` / lỗi kết nối DB | Sai `TURSO_DATABASE_URL` hoặc token hết hạn | Kiểm tra bằng `npm run db:info` |
| `process.loadEnvFile is not a function` | Node cũ hơn 20.12 | Nâng Node lên 20.12+ (đã khai báo trong `engines`) |
| Trang tài khoản tự chuyển về Đăng nhập | Phiên hết hạn (30 ngày) | Đăng nhập lại |
| Quên mật khẩu quản trị (cả trên bản deploy) | Hash bcrypt một chiều, không khôi phục được | `npm run reset-password` (dùng chung database Turso nên có hiệu lực ngay trên bản deploy) |
| Bản deploy mất dữ liệu sau khi restart | Đang dùng file SQLite trên hosting | Bắt buộc dùng Turso ở production |

---

## 👥 Thành viên & phân công

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Dương Thị Trinh Anh | HS163275 | Khối Kinh doanh/Marketing — nghiên cứu thị trường, mô hình kinh doanh |
| Phạm VƯỜN PHỐ | SE181984 | Frontend & Kế hoạch tài chính |
| Trần Quốc Nam | SE194108 | Backend & Database — kiêm User manual (video) |
| Nguyễn Tạ Khánh Duy | SE181945 | Frontend & UI/UX |
| Lê Trọng Nhân | SS180854 | Truyền thông, thương hiệu, nội dung |

---

## 📌 Ghi chú về môi trường

- **Nhánh deploy:** `main` — đã hợp nhất toàn bộ `api-engine`, nên `main` luôn là bản mới nhất. `api-engine` chỉ còn là nhánh phát triển.
- **Không dùng AI tạo số liệu.** Mọi số liệu trong báo cáo Outcome 2 phải truy xuất được về dashboard gốc (Meta Business Suite, TikTok Analytics) hoặc `GET /api/stats/funnel`.
- **Dữ liệu khách hàng là thật** — không xoá bảng `customers`/`contacts` trên Turso.

*Cập nhật: 27/09/2026*
