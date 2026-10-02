# 🌿 VƯỜN PHỐ

> **Giải pháp khí canh toàn diện: Tư vấn — So sánh — Lắp đặt — Bảo trì**
> Nền tảng giúp hộ gia đình tại TP.HCM chọn đúng hệ thống khí canh phù hợp với diện tích và ngân sách của mình.

**Học phần:** EXE201 — Khởi nghiệp 2 · Nhóm dự án 221 · GVHD: ThS. Lê Hồng Hạnh

---

## 🔗 Liên kết

| | |
|---|---|
| **Website (đang chạy)** | **https://vuonpho.onrender.com** |
| **Trang quản trị** | https://vuonpho.onrender.com/login — tài khoản `admin` *(mật khẩu mặc định `admin123` đã được đổi; quên thì chạy `node admin-reset-password.js`)* |
| **Database** | Turso `vuonpho` — region `aws-ap-northeast-1` (Tokyo) |
| **Tên miền riêng** | *(cập nhật sau khi gắn tên miền .me từ GitHub Student Pack)* |
| **Tài liệu** | `EXE201/User_Manual_VuonPho.md` · `EXE201/User_Manual_Video_Script_NAM.md` · `../OC1_OC2_Readiness_Plan.md` |

---

## 🧱 Kiến trúc

```
Người dùng ──► Render (Node.js + Express) ──► Turso (libSQL — tương thích SQLite)
                     │
                     ├── Phục vụ trang tĩnh: index/about/services/products/contact
                     ├── Trang tài khoản: register / login / account
                     ├── Trang quản trị:  /login → /admin
                     └── REST API:        /api/*
```

| Thành phần | Công nghệ | Chi phí |
|---|---|---|
| Frontend | HTML + CSS + JS thuần (không framework) | $0 |
| Backend | Node.js 20.12+ · Express 4 | $0 |
| Database | **Turso** (libSQL, tương thích cú pháp SQLite) | $0 |
| Hosting | **Render** (Web Service, free tier) | $0 |

**Vì sao tách database ra khỏi máy chủ?** Free tier của các nền tảng hosting dùng ổ đĩa tạm thời
(ephemeral) — file SQLite sẽ mất mỗi lần deploy hoặc restart. Turso lưu dữ liệu ở nơi khác nên
dữ liệu khách hàng tồn tại lâu dài, còn server có thể deploy lại thoải mái.

---

## 📁 Cấu trúc thư mục

```
aerogreen-mvp/
├── index.html            # Trang chủ
├── about.html            # Giới thiệu
├── services.html         # 4 dịch vụ
├── products.html         # 3 gói giải pháp + trợ lý chọn gói
├── contact.html          # Form liên hệ (cho khách chưa đăng nhập)
├── register.html         # Đăng ký tài khoản khách
├── login.html            # Đăng nhập
├── account.html          # Hồ sơ + gửi & theo dõi yêu cầu tư vấn
├── contract.html         # Trang hợp đồng dịch vụ (mở bằng link chia sẻ)
├── css/style.css         # Design system
├── css/auth.css          # Style riêng cho trang tài khoản
├── js/auth.js            # Phiên đăng nhập, điều hướng, UTM, tracking
├── js/api-loader.js      # Tiện ích gọi API
├── js/products-api.js    # Tải sản phẩm động từ API
├── js/script.js          # Tương tác chung
└── server/
    ├── server.js         # Khởi động: init DB → seed → listen
    ├── database.js       # Kết nối Turso/libSQL + lớp truy cập dữ liệu
    ├── seed.js           # Dữ liệu mẫu (3 gói giải pháp)
    ├── smoke-test.js     # 14 kiểm tra tự động
    ├── db-info.js        # Xem đang kết nối DB nào, có bao nhiêu bản ghi
    ├── clear-test-data.js# Xoá dữ liệu smoke test
    ├── .env.example      # Mẫu biến môi trường
    ├── middleware/       # auth (admin) · customer-auth (khách)
    ├── routes/           # auth · customers · contacts · products
    │                     # recommend · quotations · stats · track
    └── admin/            # Dashboard quản trị
```

---

## 🚀 Chạy local

**Không cần cấu hình gì.** Nếu không có biến môi trường nào, hệ thống tự dùng file
`server/aerogreen.db` (libSQL hỗ trợ `file:`).

```bash
cd server
npm install
npm start
```

Mở http://localhost:3000

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
npm start
```

---

## 🔑 Biến môi trường

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `TURSO_DATABASE_URL` | Production | `libsql://<db>-<org>.turso.io` |
| `TURSO_AUTH_TOKEN` | Production | Token của database (bí mật) |
| `JWT_SECRET` | Production | Chuỗi ngẫu nhiên ≥ 32 byte |
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

## ☁️ Deploy lên Render

### Cách A — Dùng Blueprint (nhanh nhất, đã có sẵn `render.yaml`)

1. Đăng nhập **https://dashboard.render.com** bằng GitHub
2. **New** → **Blueprint**
3. Chọn repo `aerogreen-team/aerogreen-mvp` → Render đọc `render.yaml` và tạo service
4. Render chỉ hỏi **2** biến (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`) → dán từ `server/.env`; `JWT_SECRET` do Render tự sinh.
5. Bấm **Apply** → chờ build (~2–3 phút)

### Cách B — Tạo Web Service thủ công

| Trường | Giá trị |
|---|---|
| **Repository** | `aerogreen-team/aerogreen-mvp` |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |
| **Health Check Path** | `/api/health` |

**Environment Variables** (thêm cả 3):

```
TURSO_DATABASE_URL = libsql://...
TURSO_AUTH_TOKEN   = eyJ...
JWT_SECRET         = <chuỗi ngẫu nhiên>
```

### Cách C — Không cần cấp quyền GitHub (repo đang public)

Dùng khi chưa được owner của tổ chức duyệt Render GitHub App. Render đọc repo
public trực tiếp, **không cần cài GitHub App**, nhưng **mất auto-deploy**.

1. **New** → **Web Service** → chọn tab **Public Git Repository**
2. Dán `https://github.com/aerogreen-team/aerogreen-mvp` → **Connect**
3. Điền:

| Trường | Giá trị |
|---|---|
| **Name** | `vuonpho` |
| **Branch** | `main` |
| **Runtime** | Node |
| **Region** | Singapore |
| **Build Command** | `cd server && npm install` |
| **Start Command** | `cd server && npm start` |
| **Instance Type** | Free |
| **Health Check Path** | `/api/health` |

> Vì `package.json` nằm trong `server/`, dùng `cd server && ...` thay cho Root Directory
> (trường này có thể không có ở luồng Public Git Repository).

4. **Advanced → Environment Variables**: thêm `TURSO_DATABASE_URL` và `TURSO_AUTH_TOKEN`

#### Lấy lại auto-deploy bằng Deploy Hook

1. Render → service → **Settings** → **Deploy Hook** → copy URL
2. GitHub repo → **Settings → Secrets and variables → Actions** → **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK`
   - Secret: dán URL vừa copy
3. Xong. Workflow `.github/workflows/deploy-render.yml` sẽ tự gọi hook mỗi khi push `main`

> Chưa đặt được secret (cần quyền admin repo)? Workflow sẽ tự bỏ qua và ghi chú,
> không báo lỗi. Khi đó deploy tay: Render → **Manual Deploy** → **Deploy latest commit**.

### Sau khi deploy

```bash
cd server
npm run smoke https://<ten-service>.onrender.com   # 14 kiểm tra trên bản deploy
npm run db:info                                    # xem dữ liệu trên Turso
npm run db:clean                                   # xoá dữ liệu test
npm run reset-password                             # quên mật khẩu quản trị → đặt lại
```

⚠️ **Free tier ngủ sau ~15 phút** không có truy cập; lần truy cập đầu chậm ~30–60 giây.
**Trước buổi báo cáo, mở link một lần để đánh thức service.**

---

## 🌐 Gắn tên miền

1. Lấy tên miền miễn phí 1 năm qua **GitHub Student Pack** (Namecheap `.me`, hoặc Name.com `.app`/`.dev`, hoặc `.TECH`)
2. Render → service → **Settings** → **Custom Domains** → thêm tên miền
3. Tại nhà đăng ký tên miền, thêm bản ghi DNS theo hướng dẫn Render (thường là `CNAME` → `<ten-service>.onrender.com`)
4. Chờ DNS (~5–30 phút). Render tự cấp HTTPS.

---

## 🧰 Lệnh có sẵn

| Lệnh | Tác dụng |
|---|---|
| `npm start` | Chạy server (cổng 3000) |
| `npm run dev` | Chạy kèm tự động nạp lại khi sửa code |
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
| `POST` | `/api/contact` | Gửi yêu cầu tư vấn (không cần đăng nhập) |
| `POST` | `/api/track` | Ghi nhận lượt truy cập / sự kiện |
| `POST` | `/api/customers/register` | Đăng ký tài khoản khách |
| `POST` | `/api/customers/login` | Đăng nhập khách |
| `GET` | `/api/quotations/by-request/:requestId` | Báo giá cho trang hợp đồng (công khai) |

Cần đăng nhập **khách** (JWT): `GET/PUT /api/customers/me`, `GET/POST /api/customers/me/requests`

Cần đăng nhập **quản trị** (JWT): `/api/contacts/*`, `/api/stats`, `/api/stats/funnel`, `/api/quotations/*`

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
| Render không thấy repo trong danh sách | Render GitHub App chưa được cài/duyệt cho tổ chức `aerogreen-team` | Owner duyệt tại `github.com/organizations/aerogreen-team/settings/installations`, hoặc dùng **Cách C** ở trên |
| Trang mở được nhưng gửi form báo "Không kết nối được máy chủ" | Backend chưa chạy | Chạy `npm start` trong `server/`, hoặc đánh thức service Render |
| `SQLITE_...` / lỗi kết nối DB | Sai `TURSO_DATABASE_URL` hoặc token hết hạn | Kiểm tra bằng `npm run db:info` |
| `process.loadEnvFile is not a function` | Node cũ hơn 20.12 | Nâng Node lên 20.12+ (đã khai báo trong `engines`) |
| Trang tài khoản tự chuyển về Đăng nhập | Phiên hết hạn (30 ngày) | Đăng nhập lại |
| Quên mật khẩu quản trị (cả trên bản deploy) | Hash bcrypt một chiều, không khôi phục được | `cd server && node admin-reset-password.js` (dùng chung database Turso nên có hiệu lực ngay trên bản deploy) |
| Bản deploy mất dữ liệu sau khi restart | Đang dùng file SQLite trên hosting | Bắt buộc dùng Turso ở production |

---

## 👥 Thành viên & phân công

| Thành viên | MSSV | Vai trò |
|---|---|---|
| Dương Thị Trinh Anh | HS163275 | Khối Kinh doanh/Marketing — nghiên cứu thị trường, mô hình kinh doanh |
| Phạm Văn Kha | SE181984 | Frontend & Kế hoạch tài chính |
| Trần Quốc Nam | SE194108 | Backend & Database — kiêm User manual (video) |
| Nguyễn Tạ Khánh Duy | SE181945 | Frontend & UI/UX |
| Lê Trọng Nhân | SS180854 | Truyền thông, thương hiệu, nội dung |

---

## 📌 Ghi chú về môi trường

- **Nhánh deploy:** `main` — đã hợp nhất toàn bộ `api-engine`, nên `main` luôn là bản mới nhất. `api-engine` chỉ còn là nhánh phát triển.
- **Không dùng AI tạo số liệu.** Mọi số liệu trong báo cáo Outcome 2 phải truy xuất được về dashboard gốc (Meta Business Suite, TikTok Analytics) hoặc `GET /api/stats/funnel`.
- **Dữ liệu khách hàng là thật** — không xoá bảng `customers`/`contacts` trên Turso.

*Cập nhật: 27/09/2026*
